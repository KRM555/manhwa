import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function AuthModal() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) toast.error(error.message);
  };

  const handleDiscordLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'discord' });
    if (error) toast.error(error.message);
  };

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast.error('يرجى كتابة البريد وكلمة المرور');
      return;
    }
    setLoading(true);
    
    // التعديل هنا: مسح أي مسافات قبل أو بعد الإيميل
    const cleanEmail = email.trim();

    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email: cleanEmail, password })
      : await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isSignUp ? 'تم إنشاء الحساب! افحص بريدك للترخيص' : 'تم تسجيل الدخول بنجاح!');
      setIsOpen(false);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info('تم تسجيل الخروج');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-xs font-bold rounded-xl border-orange-500/30 hover:bg-orange-500/10">
          <User className="w-4 h-4 text-orange-500" />
          {user ? (user.email?.split('@')[0] || 'بروفايلي') : 'حسابي / تسجيل الدخول'}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm rounded-2xl dir-rtl text-right">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-center">
            {user ? 'الملف الشخصي' : 'تسجيل الدخول / حساب جديد'}
          </DialogTitle>
        </DialogHeader>

        {user ? (
          <div className="space-y-4 py-2 text-center">
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground">الحساب المسجل:</p>
              <p className="text-sm font-bold text-foreground mt-1">{user.email}</p>
            </div>

            <Button onClick={handleLogout} variant="destructive" className="w-full h-9 text-xs font-bold rounded-xl gap-2">
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <Button onClick={handleGoogleLogin} variant="outline" className="w-full h-9 text-xs font-bold rounded-xl gap-2">
              التسجيل بـ Google
            </Button>

            <Button onClick={handleDiscordLogin} variant="outline" className="w-full h-9 text-xs font-bold rounded-xl gap-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
              التسجيل بـ Discord
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-background px-2 text-muted-foreground">أو بالبريد الإلكتروني</span></div>
            </div>

            <Input placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-xs" />
            <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-8 text-xs" />

            <div className="flex gap-2 pt-1">
              <Button onClick={() => handleEmailAuth(false)} disabled={loading} className="flex-1 h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white">
                دخول
              </Button>
              <Button onClick={() => handleEmailAuth(true)} disabled={loading} variant="outline" className="flex-1 h-8 text-xs font-bold">
                حساب جديد
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}