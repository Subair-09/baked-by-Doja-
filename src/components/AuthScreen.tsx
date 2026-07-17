import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Phone, Lock, Sparkles, ArrowRight, LogIn, CheckCircle2, Mail } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (user: { name: string; phone: string; role?: string }) => void;
  onClose?: () => void;
}

export default function AuthScreen({ onSuccess, onClose }: AuthScreenProps) {
  const isExplicitAdminUrl = typeof window !== 'undefined' && (
    window.location.pathname === '/auth/signin' || 
    window.location.pathname === '/auth/signin/' ||
    window.location.hash === '#admin-login' ||
    window.location.search.includes('admin=true')
  );

  const [authTab, setAuthTab] = useState<'signup' | 'login' | 'admin'>(() => {
    return isExplicitAdminUrl ? 'admin' : 'signup';
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isLogin = authTab === 'login' || authTab === 'admin';
  const isAdmin = authTab === 'admin';

  // Helper to fetch registered users from localStorage
  const getRegisteredUsers = (): Array<{ name: string; phone: string; password?: string }> => {
    try {
      const stored = localStorage.getItem('baked_by_doja_users');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Field validations
    if (!phone || !password) {
      setError('Please fill out all required fields.');
      return;
    }

    if (authTab === 'signup' && !name) {
      setError('Please tell us your name so we know who to bake for!');
      return;
    }

    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();

    try {
      // Attempt API request
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { phone: trimmedPhone, password }
        : { name: trimmedName, phone: trimmedPhone, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setSuccessMsg(isLogin ? `Welcome back, ${data.user.name}!` : `Account created! Welcoming you to the fresh sunrise bakery...`);
      const userPayload = {
        name: data.user.name,
        phone: data.user.phone,
        role: data.user.role || (data.user.phone === 'admin' ? 'admin' : undefined),
        token: data.token
      };
      localStorage.setItem('baked_by_doja_current_user', JSON.stringify(userPayload));
      setTimeout(() => {
        onSuccess(userPayload);
      }, 1000);

    } catch (err: any) {
      console.warn("API Auth info/error, checking fallback:", err);
      
      // Admin check again in case API is down but they entered details
      if (trimmedPhone === 'adeyemifaridah23@gmail.com' && password === 'Anike2003') {
        setSuccessMsg('Welcome back, Admin Faridah!');
        const adminUser = { name: 'Admin Faridah', phone: 'admin', role: 'admin', token: 'mock-admin-token' };
        localStorage.setItem('baked_by_doja_current_user', JSON.stringify(adminUser));
        setTimeout(() => {
          onSuccess(adminUser);
        }, 1000);
        return;
      }

      // Fallback to offline localStorage logic
      const users = getRegisteredUsers();

      if (isLogin) {
        // Login Logic Fallback
        const foundUser = users.find(
          (u) => u.phone.trim() === trimmedPhone && u.password === password
        );

        if (foundUser) {
          setSuccessMsg(`Welcome back, ${foundUser.name}!`);
          localStorage.setItem('baked_by_doja_current_user', JSON.stringify({
            name: foundUser.name,
            phone: foundUser.phone,
          }));
          setTimeout(() => {
            onSuccess({ name: foundUser.name, phone: foundUser.phone });
          }, 1000);
        } else {
          setError(err.message || 'Incorrect credentials. Please try again!');
        }
      } else {
        // Register Logic Fallback
        const userExists = users.some((u) => u.phone.trim() === trimmedPhone);

        if (userExists) {
          setError('An account with this phone number already exists. Try logging in!');
          return;
        }

        const newUser = {
          name: trimmedName,
          phone: trimmedPhone,
          password: password,
        };

        users.push(newUser);
        localStorage.setItem('baked_by_doja_users', JSON.stringify(users));
        localStorage.setItem('baked_by_doja_current_user', JSON.stringify({
          name: newUser.name,
          phone: newUser.phone,
        }));

        setSuccessMsg(`Account created! Welcoming you to the fresh sunrise bakery...`);
        setTimeout(() => {
          onSuccess({ name: newUser.name, phone: newUser.phone });
        }, 1200);
      }
    }
  };

  return (
    <div className="w-full flex flex-col justify-between py-2" id="auth-flow-container">
      <div>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center bg-banana/20 p-2.5 rounded-full mb-3">
            <Sparkles className="w-6 h-6 text-caramel fill-banana animate-pulse" />
          </div>
          <h3 className="text-2xl font-serif font-black tracking-tight text-chocolate">
            {isAdmin ? 'Admin Portal' : isLogin ? 'Welcome Back!' : 'Fresh Sunrise Checkout'}
          </h3>
          <p className="text-xs text-chocolate/75 mt-1 max-w-sm mx-auto">
            {isAdmin
              ? 'Authorized bakery login to manage baking orders and delivery routes.'
              : isLogin 
              ? 'Log in to instantly retrieve your previous baking slots and details.' 
              : 'Create a super fast account to secure your delivery slots in Nigeria.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-beige/80 border border-chocolate/5 p-1 rounded-2xl max-w-sm mx-auto mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthTab('signup');
              setError('');
            }}
            className={`flex-1 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all ${
              authTab === 'signup'
                ? 'bg-chocolate text-cream shadow-sm'
                : 'text-chocolate/60 hover:text-chocolate'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('login');
              setError('');
            }}
            className={`flex-1 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all ${
              authTab === 'login'
                ? 'bg-chocolate text-cream shadow-sm'
                : 'text-chocolate/60 hover:text-chocolate'
            }`}
          >
            Log In
          </button>
          {isExplicitAdminUrl && (
            <button
              type="button"
              onClick={() => {
                setAuthTab('admin');
                setError('');
              }}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-black rounded-xl transition-all ${
                authTab === 'admin'
                  ? 'bg-chocolate text-cream shadow-sm border border-yellow-500/10'
                  : 'text-chocolate/60 hover:text-chocolate'
              }`}
            >
              Admin
            </button>
          )}
        </div>

        <form onSubmit={handleAuth} className="space-y-4 max-w-sm mx-auto">
          {/* Name Field (Sign Up Only) */}
          {authTab === 'signup' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase text-chocolate/70 tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-chocolate/40">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Adewale Doja"
                  className="w-full bg-white border border-chocolate/10 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-caramel focus:outline-none focus:ring-1 focus:ring-caramel"
                />
              </div>
            </div>
          )}

          {/* Phone Field / Email Field */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase text-chocolate/70 tracking-wider">
              {isAdmin ? 'Admin Email Address' : 'Phone Number (For WhatsApp / Delivery)'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-chocolate/40">
                {isAdmin ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
              </span>
              <input
                type={isAdmin ? "email" : "tel"}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isAdmin ? "adeyemifaridah23@gmail.com" : "e.g. 08012345678"}
                className="w-full bg-white border border-chocolate/10 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-caramel focus:outline-none focus:ring-1 focus:ring-caramel"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase text-chocolate/70 tracking-wider">
              {isAdmin ? 'Secret Admin Password' : 'Choose Password / PIN'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-chocolate/40">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isAdmin ? "Enter secret code" : "Make it simple (e.g. 1234)"}
                className="w-full bg-white border border-chocolate/10 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-caramel focus:outline-none focus:ring-1 focus:ring-caramel"
              />
            </div>
          </div>

          {/* Error and Success alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold text-center"
            >
              {error}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            className="w-full bg-chocolate hover:bg-chocolate/90 text-cream font-bold text-xs py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isAdmin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In as Admin</span>
              </>
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In & Secure Order</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>Sign Up & Secure Order</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="text-center mt-6 pt-4 border-t border-chocolate/5">
        <button
          type="button"
          onClick={() => {
            // Fill with a quick mock account to let them pass with 1 click if they really want
            setName('Guest Customer');
            setPhone('08000000000');
            setPassword('1234');
            setAuthTab('signup');
          }}
          className="text-[10px] text-chocolate/55 hover:text-chocolate font-bold underline transition-colors"
        >
          Fast Checkout as Guest Customer
        </button>
      </div>
    </div>
  );
}
