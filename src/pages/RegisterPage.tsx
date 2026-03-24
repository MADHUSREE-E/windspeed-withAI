import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wind, Mail, Lock, User, AlertCircle, Phone, CheckCircle,
  ShieldCheck, Eye, EyeOff, RefreshCw, Loader
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailOTP, verifyEmailOTP } from '../services/otpService';
import {
  isFirebaseConfigured,
  sendFirebasePhoneOTP,
  confirmFirebaseOTP,
} from '../services/firebasePhone';

type Step = 'form' | 'verify';
type SendState = 'idle' | 'sending' | 'sent' | 'error';

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Per-channel send state
  const [emailSend, setEmailSend] = useState<SendState>('idle');
  const [phoneSend, setPhoneSend] = useState<SendState>('idle');
  const [emailDemo, setEmailDemo] = useState<string | undefined>();
  const [phoneDemo, setPhoneDemo] = useState<string | undefined>();
  const usingFirebase = isFirebaseConfigured();

  // OTP inputs
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // Password strength
  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return { level: 0, label: '', color: '' };
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (s <= 1) return { level: 1, label: 'Weak', color: 'bg-red-400' };
    if (s <= 2) return { level: 2, label: 'Fair', color: 'bg-yellow-400' };
    if (s <= 3) return { level: 3, label: 'Good', color: 'bg-blue-400' };
    return { level: 4, label: 'Strong', color: 'bg-green-500' };
  })();

  // ── Step 1: validate and advance to OTP step ────────────────────────────────
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Full name is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Enter a valid email address.'); return; }
    if (!/^\+?[\d\s\-()]{7,15}$/.test(formData.phone)) { setError('Enter a valid phone number (7–15 digits, may include + or spaces).'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
    setStep('verify');
  };

  // ── Send / resend OTP via real API ──────────────────────────────────────────
  const handleSendEmailOTP = async () => {
    setEmailSend('sending');
    setEmailDemo(undefined);
    setEmailInput('');
    setEmailVerified(false);
    setError('');
    const result = await sendEmailOTP(formData.email, formData.name);
    if (!result.sent) {
      setEmailSend('error');
      setError(result.error || 'Failed to send email OTP. Please try again.');
      return;
    }
    setEmailSend('sent');
    if (result.demo) setEmailDemo(result.demoCode);
  };

  const handleSendPhoneOTP = async () => {
    setPhoneSend('sending');
    setPhoneDemo(undefined);
    setPhoneInput('');
    setPhoneVerified(false);
    setError('');

    if (usingFirebase) {
      // Firebase Phone Auth — real SMS, handles India DLT automatically
      const result = await sendFirebasePhoneOTP(formData.phone, 'recaptcha-container');
      if (result.sent) {
        setPhoneSend('sent');
      } else {
        setPhoneSend('error');
        setError(result.error || 'Failed to send SMS. Please try again.');
      }
    } else {
      // Demo fallback — show code on screen
      const { sendPhoneOTP } = await import('../services/otpService');
      const result = await sendPhoneOTP(formData.phone);
      setPhoneSend('sent');
      if (result.demo) setPhoneDemo(result.demoCode);
    }
  };

  // Send both when arriving at step 2
  const goToVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Full name is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Enter a valid email address.'); return; }
    if (!/^\+?[\d\s\-()]{7,15}$/.test(formData.phone)) { setError('Enter a valid phone number.'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }

    setStep('verify');
    setEmailSend('sending');
    setPhoneSend('sending');

    // Send email OTP
    const emailRes = await sendEmailOTP(formData.email, formData.name);
    setEmailSend(emailRes.sent ? 'sent' : 'error');
    if (emailRes.demo) setEmailDemo(emailRes.demoCode);

    // Send phone OTP via Firebase or fallback
    if (usingFirebase) {
      const phoneRes = await sendFirebasePhoneOTP(formData.phone, 'recaptcha-container');
      setPhoneSend(phoneRes.sent ? 'sent' : 'error');
      if (!phoneRes.sent) setError(phoneRes.error || 'Failed to send SMS.');
    } else {
      const { sendPhoneOTP } = await import('../services/otpService');
      const phoneRes = await sendPhoneOTP(formData.phone);
      setPhoneSend('sent');
      if (phoneRes.demo) setPhoneDemo(phoneRes.demoCode);
    }
  };

  // ── Verify inputs ───────────────────────────────────────────────────────────
  const checkEmailOTP = () => {
    if (verifyEmailOTP(emailInput)) {
      setEmailVerified(true);
      setError('');
    } else {
      setError('Incorrect or expired email OTP. Please try again.');
    }
  };

  const checkPhoneOTP = async () => {
    if (usingFirebase) {
      const result = await confirmFirebaseOTP(phoneInput);
      if (result.verified) {
        setPhoneVerified(true);
        setError('');
      } else {
        setError(result.error || 'Incorrect code. Please try again.');
      }
    } else {
      const { verifyPhoneOTP } = await import('../services/otpService');
      if (verifyPhoneOTP(phoneInput)) {
        setPhoneVerified(true);
        setError('');
      } else {
        setError('Incorrect or expired phone OTP. Please try again.');
      }
    }
  };

  // ── Final registration ───────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!emailVerified || !phoneVerified) {
      setError('Please verify both email and phone before completing registration.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await register(formData.email, formData.password, formData.name, formData.phone);
      if (result.success) {
        navigate('/prediction');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-white dark:bg-gray-900">
      <div className="max-w-md w-full space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <Wind className="h-9 w-9 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">WindCast Pro</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h2>
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium">Sign in</Link>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${step === 'form' ? 'text-blue-600' : 'text-green-600'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs text-white font-bold ${step === 'form' ? 'bg-blue-600' : 'bg-green-500'}`}>
                {step === 'form' ? '1' : '✓'}
              </span>
              Details
            </div>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${step === 'verify' ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'verify' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>2</span>
              Verify
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* ── Step 1: Form ── */}
          {step === 'form' && (
            <form onSubmit={goToVerify} className="space-y-4">
              <Field label="Full Name" icon={<User className="h-4 w-4 text-gray-400" />}>
                <input name="name" type="text" value={formData.name} onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Enter your full name" required />
              </Field>

              <Field label="Email Address" icon={<Mail className="h-4 w-4 text-gray-400" />}>
                <input name="email" type="email" value={formData.email} onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="you@example.com" required />
              </Field>

              <Field label="Phone Number" icon={<Phone className="h-4 w-4 text-gray-400" />}>
                <input name="phone" type="tel" value={formData.phone} onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="+91 98765 43210" required />
              </Field>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    placeholder="Minimum 6 characters" required />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-1.5">
                    <div className="flex gap-1 mb-0.5">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength.level ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-600'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{passwordStrength.label}</span>
                  </div>
                )}
              </div>

              <Field label="Confirm Password" icon={<Lock className="h-4 w-4 text-gray-400" />}
                suffix={formData.confirmPassword ? (
                  formData.password === formData.confirmPassword
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : <AlertCircle className="h-4 w-4 text-red-400" />
                ) : null}>
                <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange}
                  className="w-full pl-9 pr-9 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Repeat your password" required />
              </Field>

              <button type="submit"
                className="w-full py-3 px-4 rounded-xl text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-colors mt-2 text-sm">
                Continue — Send Verification Codes →
              </button>
            </form>
          )}

          {/* ── Step 2: OTP Verification ── */}
          {step === 'verify' && (
            <div className="space-y-4">
              {/* Invisible reCAPTCHA mount point for Firebase Phone Auth */}
              <div id="recaptcha-container" />
              {/* Email OTP card */}
              <OTPCard
                icon={<Mail className="h-4 w-4 text-blue-500" />}
                label="Email Verification"
                target={formData.email}
                sendState={emailSend}
                demoCode={emailDemo}
                verified={emailVerified}
                inputValue={emailInput}
                onInputChange={setEmailInput}
                onSend={handleSendEmailOTP}
                onVerify={checkEmailOTP}
                channel="email"
              />

              {/* Phone OTP card */}
              <OTPCard
                icon={<Phone className="h-4 w-4 text-green-500" />}
                label="Phone Verification"
                target={formData.phone}
                sendState={phoneSend}
                demoCode={phoneDemo}
                verified={phoneVerified}
                inputValue={phoneInput}
                onInputChange={setPhoneInput}
                onSend={handleSendPhoneOTP}
                onVerify={checkPhoneOTP}
                channel="phone"
              />

              {/* Complete button */}
              <button
                onClick={handleRegister}
                disabled={!emailVerified || !phoneVerified || loading}
                className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm ${
                  emailVerified && phoneVerified && !loading
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? <Loader className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? 'Creating account...' : 'Complete Registration'}
              </button>

              <button
                onClick={() => { setStep('form'); setError(''); setEmailSend('idle'); setPhoneSend('idle'); setEmailDemo(undefined); setPhoneDemo(undefined); setEmailVerified(false); setPhoneVerified(false); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition py-1"
              >
                ← Edit registration details
              </button>
            </div>
          )}

          <div className="mt-5 text-center">
            <Link to="/" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 text-xs">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  icon: React.ReactNode;
  suffix?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, icon, suffix, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
      {children}
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</span>}
    </div>
  </div>
);

const OTPCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  target: string;
  sendState: SendState;
  demoCode?: string;
  verified: boolean;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onVerify: () => void;
  channel: 'email' | 'phone';
}> = ({ icon, label, target, sendState, demoCode, verified, inputValue, onInputChange, onSend, onVerify, channel }) => {
  const borderClass = verified
    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
    : 'border-gray-200 dark:border-gray-600';

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${borderClass}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</span>
          {verified && <CheckCircle className="h-4 w-4 text-green-500" />}
        </div>
        {!verified && (
          <button
            onClick={onSend}
            disabled={sendState === 'sending'}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            {sendState === 'sending' ? (
              <><Loader className="h-3 w-3 animate-spin" /> Sending…</>
            ) : sendState === 'sent' ? (
              <><RefreshCw className="h-3 w-3" /> Resend</>
            ) : (
              'Send Code'
            )}
          </button>
        )}
      </div>

      {/* Status banner */}
      {sendState === 'sent' && !verified && (
        <div className={`text-xs mb-2 rounded-lg px-3 py-2 ${demoCode ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300' : 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'}`}>
          {demoCode ? (
            <>
              <span className="font-semibold block">Demo mode</span>
              No {channel === 'email' ? 'email' : 'SMS'} API key configured — code is shown here for testing.{' '}
              <span className="font-mono font-bold text-base tracking-widest">{demoCode}</span>
              <span className="block mt-0.5 opacity-70">See .env.example to enable real delivery.</span>
            </>
          ) : (
            <>Code sent to <strong>{target}</strong>. Check your {channel === 'email' ? 'inbox (or spam)' : 'messages'}.</>
          )}
        </div>
      )}

      {/* OTP input + verify */}
      {!verified && sendState !== 'idle' && (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={inputValue}
            onChange={e => onInputChange(e.target.value.replace(/\D/g, ''))}
            disabled={sendState !== 'sent'}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-center text-xl font-mono tracking-[0.4em] focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-40"
            placeholder="——————"
          />
          <button
            onClick={onVerify}
            disabled={inputValue.length !== 6 || sendState !== 'sent'}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition"
          >
            Verify
          </button>
        </div>
      )}

      {/* Prompt to send when idle */}
      {!verified && sendState === 'idle' && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Click "Send Code" to receive your {channel === 'email' ? 'email' : 'SMS'} OTP.</p>
      )}

      {verified && (
        <p className="text-sm text-green-700 dark:text-green-300 font-medium">
          ✓ {channel === 'email' ? 'Email' : 'Phone'} verified successfully
        </p>
      )}
    </div>
  );
};

export default RegisterPage;
