import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, LogOut, History, FileImage, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  image_name: string;
  extracted_count: number;
  created_at: string;
}

export function AuthModal() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // جلب سجل المستخدم عند فتح النافذة
  useEffect(() => {
    if (isOpen && user) {
      fetchUserHistory();
    }
  }, [isOpen, user]);

  const fetchUserHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('user_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setHistory(data);
    }
    setLoadingHistory(false);
  };

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
    const cleanEmail = email.trim();

    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email: cleanEmail, password })
      : await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isSignUp ? 'تم إنشاء الحساب!' : 'تم تسجيل الدخول بنجاح!');
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

      <DialogContent className="max-w-md rounded-2xl dir-rtl text-right">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-center">
            {user ? 'الملف الشخصي وسجل العمليات' : 'تسجيل الدخول / حساب جديد'}
          </DialogTitle>
        </DialogHeader>

        {user ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-muted-foreground">الحساب المسجل:</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{user.email}</p>
              </div>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="h-8 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-1">
                <LogOut className="w-3.5 h-3.5" /> خروج
              </Button>
            </div>

            {/* سجل العمليات */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500">
                <History className="w-4 h-4" />
                <span>سجل الاستخراج والترجمة السابقة:</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {loadingHistory ? (
                  <p className="text-center text-xs text-muted-foreground py-4">جاري تحميل السجل...</p>
                ) : history.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground">
                    <p className="text-xs">لا يوجد سجل عمليات حتى الآن</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="p-2.5 bg-background rounded-xl border border-border/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileImage className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="font-medium truncate max-w-[180px]">{item.image_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                        <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md font-semibold">
                          {item.extracted_count} نص
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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