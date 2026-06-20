import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const HERO_IMG = 'https://cdn.poehali.dev/projects/75c7bfbb-449a-496c-8281-98107283b3f9/files/de879b5f-784b-4efc-aae0-27bb39592480.jpg';
const BOT_IMG = 'https://cdn.poehali.dev/projects/75c7bfbb-449a-496c-8281-98107283b3f9/files/7be9c0ba-8963-4ff7-80a7-8369c1a5d805.jpg';

const nav = [
  { id: 'feed', label: 'Лента', icon: 'Newspaper' },
  { id: 'team', label: 'Команда', icon: 'Users' },
  { id: 'calendar', label: 'Календарь', icon: 'CalendarHeart' },
  { id: 'helper', label: 'Помощник', icon: 'MessageCircleHeart' },
  { id: 'integrations', label: 'Сервисы', icon: 'Plug' },
];

const feed = [
  { tag: 'Telegram', tagColor: 'bg-secondary text-secondary-foreground', icon: 'Send', title: 'Запускаем новый продукт уже в пятницу', text: 'Команда маркетинга поделилась анонсом в корпоративном канале. Загляните за деталями.', time: '12 минут назад', author: 'Канал «Новости»' },
  { tag: 'Мероприятие', tagColor: 'bg-accent text-accent-foreground', icon: 'PartyPopper', title: 'Пятничный тимбилдинг в 18:00', text: 'Собираемся в лофте на Цветном. Будут настолки, пицца и квиз с призами.', time: '1 час назад', author: 'HR-отдел' },
  { tag: 'День рождения', tagColor: 'bg-primary text-primary-foreground', icon: 'Cake', title: 'Сегодня день рождения у Анны Беловой', text: 'Поздравьте коллегу — бот уже отправил тёплое приветствие от всей команды!', time: '3 часа назад', author: 'Авто-поздравления' },
];

const team = [
  { name: 'Анна Белова', role: 'Дизайнер', dept: 'Продукт', initials: 'АБ', tg: '@anna_b' },
  { name: 'Игорь Сомов', role: 'Backend', dept: 'Разработка', initials: 'ИС', tg: '@igor_dev' },
  { name: 'Мария Кац', role: 'HR Lead', dept: 'Люди', initials: 'МК', tg: '@maria_hr' },
  { name: 'ОлегРинат', role: 'Маркетолог', dept: 'Рост', initials: 'ОР', tg: '@oleg_mk' },
];

const events = [
  { day: '19', month: 'ИЮН', title: 'День рождения Анны', type: 'Поздравление', color: 'bg-primary' },
  { day: '20', month: 'ИЮН', title: 'Тимбилдинг в лофте', type: 'Мероприятие', color: 'bg-accent' },
  { day: '24', month: 'ИЮН', title: 'Welcome-встреча новичков', type: 'Онбординг', color: 'bg-secondary' },
  { day: '28', month: 'ИЮН', title: 'День рождения Игоря', type: 'Поздравление', color: 'bg-primary' },
];

const faq = [
  { q: 'Где найти регламенты и доступы?', a: 'Всё в разделе «Сервисы» — там собраны ссылки на Telegram, Notion и почту.' },
  { q: 'Как подключиться к корпоративному каналу?', a: 'Откройте «Сервисы» и нажмите «Подключить Telegram» — бот добавит вас автоматически.' },
  { q: 'Кто поздравляет коллег с днём рождения?', a: 'Бот делает это сам и присылает напоминание команде за день до события.' },
];

const integrations = [
  { name: 'Telegram-канал', desc: 'Лента новостей и анонсов', icon: 'Send', status: 'Подключено', on: true },
  { name: 'Чат-бот онбординга', desc: 'Помощник для новичков', icon: 'Bot', status: 'Подключено', on: true },
  { name: 'Авто-поздравления', desc: 'Дни рождения коллег', icon: 'Cake', status: 'Активно', on: true },
  { name: 'Email-уведомления', desc: 'Дайджест мероприятий', icon: 'Mail', status: 'Настроить', on: false },
];

const TELEGRAM_FEED_URL = 'https://functions.poehali.dev/cfb59cf0-eb70-481c-ad5f-3b4d0368839f';
const EMPLOYEES_URL = 'https://functions.poehali.dev/a1ee0a1b-ecf4-451d-a47d-e6f321fa88ec';
const BIRTHDAY_GREET_URL = 'https://functions.poehali.dev/de8d8849-4828-4b2a-a26c-d70e62353206';

type Employee = { id: number; name: string; role: string; birthday: string; tgUsername: string; greetedYear: number | null; photoUrl: string; email: string; joinedAt: string | null; daysInCompany: number | null; department: string };

const DEPARTMENTS = ['HRD','CFO','ITD','PRD','Исполнительная дирекция','Производственная дирекция','Дирекция по логистике','CEO','Дирекция по закупкам','Дирекция клиентского сервиса','Дирекция по правовым вопросам','Другое'];
type TgPost = { id: number; channel: string; text: string; postedAt: string; mediaType: string | null; mediaUrl: string | null; mediaFileUrl: string | null; mediaGroupId: string | null };

const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const formatBirthday = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'только что';
  if (diff < 60) return `${diff} мин назад`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`;
  return `${Math.floor(diff / 1440)} дн назад`;
};

const Index = () => {
  const [active, setActive] = useState('feed');
  const [tgPosts, setTgPosts] = useState<TgPost[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pulse, setPulse] = useState(false);

  const loadPosts = () => {
    fetch(TELEGRAM_FEED_URL)
      .then((r) => r.json())
      .then((d) => {
        setTgPosts(d.posts || []);
        setLastUpdated(new Date());
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPosts();
    const timer = setInterval(loadPosts, 60000);
    return () => clearInterval(timer);
  }, []);

  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeDept, setActiveDept] = useState('Все');
  const [newEmp, setNewEmp] = useState({ name: '', role: '', birthday: '', tgUsername: '', email: '', joinedAt: '', department: '' });
  const [newEmpPhoto, setNewEmpPhoto] = useState<string>('');
  const [greetStatus, setGreetStatus] = useState<string | null>(null);
  const [greetLoading, setGreetLoading] = useState(false);

  const loadEmployees = () => {
    setEmpLoading(true);
    fetch(EMPLOYEES_URL)
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees || []))
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  };

  useEffect(() => { loadEmployees(); }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setNewEmpPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addEmployee = async () => {
    if (!newEmp.name || !newEmp.birthday) return;
    const res = await fetch(EMPLOYEES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmp),
    });
    const data = await res.json();
    const newId = data.id;
    if (newEmpPhoto && newId) {
      await fetch(`${EMPLOYEES_URL}/upload-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, photo: newEmpPhoto }),
      }).catch(() => {});
    }
    loadEmployees();
    setShowAddForm(false);
    setNewEmp({ name: '', role: '', birthday: '', tgUsername: '', email: '', joinedAt: '', department: '' });
    setNewEmpPhoto('');
  };

  const uploadPhoto = (id: number, dataUrl: string) => {
    fetch(`${EMPLOYEES_URL}/upload-photo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, photo: dataUrl }),
    }).then(() => loadEmployees()).catch(() => {});
  };

  const deleteEmployee = (id: number) => {
    fetch(`${EMPLOYEES_URL}?id=${id}`, { method: 'DELETE' })
      .then(() => loadEmployees())
      .catch(() => {});
  };

  const runGreetings = () => {
    setGreetLoading(true);
    setGreetStatus(null);
    fetch(BIRTHDAY_GREET_URL)
      .then((r) => r.json())
      .then((d) => {
        if (d.sent?.length > 0) setGreetStatus(`🎉 Поздравления отправлены: ${d.sent.map((s: { name: string }) => s.name).join(', ')}`);
        else setGreetStatus('Сегодня именинников нет — бот проверил список.');
      })
      .catch(() => setGreetStatus('Ошибка соединения. Попробуйте позже.'))
      .finally(() => setGreetLoading(false));
  };

  const [chat, setChat] = useState([
    { from: 'bot', text: 'Привет! Добро пожаловать в GreenTeam_2.0 🌿\n\nЯ помогу тебе быстро освоиться. Выбери тему или напиши вопрос!' },
  ]);
  const [msg, setMsg] = useState('');

  const quickReplies = [
    { label: '📋 Регламенты и доступы', answer: 'Все регламенты и доступы находятся в разделе «Сервисы». Там собраны ссылки на Notion, корпоративную почту и Telegram-канал.' },
    { label: '📣 Telegram-канал', answer: 'Наш корпоративный Telegram-бот: @green_team_2_0_bot\n\nПерейди по ссылке и нажми /start — бот расскажет всё о компании и добавит тебя в нужные чаты.' },
    { label: '👤 Контакты HR', answer: 'По любым вопросам адаптации пиши напрямую HR-команде в Telegram-бот: @green_team_2_0_bot\n\nМы всегда на связи!' },
    { label: '🎂 Дни рождения', answer: 'Дни рождения коллег видны в Календаре (боковая панель). Бот сам поздравляет именинников в день рождения — ничего делать не нужно!' },
    { label: '🚀 Первые шаги новичка', answer: 'Вот что важно сделать в первую неделю:\n\n1️⃣ Напиши /start боту @green_team_2_0_bot — он добавит тебя в чаты\n2️⃣ Познакомься с командой в разделе «Команда»\n3️⃣ Загляни в раздел «Сервисы» — там все нужные инструменты\n4️⃣ Подпишись на корпоративный Telegram-канал\n5️⃣ Заполни свой профиль сотрудника 🌿' },
    { label: '🛠 Инструменты команды', answer: 'Инструменты GreenTeam_2.0:\n\n💬 Telegram — основной канал общения\n📋 Notion — база знаний и регламенты\n📧 Корпоративная почта — официальная переписка\n🤖 @green_team_2_0_bot — помощник и онбординг\n\nДоступы выдаёт HR — пиши в бот!' },
    { label: '💚 Ценности команды', answer: 'Ценности GreenTeam_2.0:\n\n🌿 Экологичность — думаем о людях и планете\n🤝 Честность — открытость во всём\n🚀 Развитие — учимся и растём вместе\n💪 Результат — доводим до конца\n❤️ Забота — о коллегах, клиентах и себе\n\nМы команда победителей!' },
  ];

  const send = (text?: string) => {
    const userText = text ?? msg;
    if (!userText.trim()) return;
    const quick = quickReplies.find((q) => q.label === userText);
    const botReply = quick
      ? quick.answer
      : `Хороший вопрос! Для детального ответа обратись к боту: @green_team_2_0_bot — там найдёшь всё о компании 🌿`;
    setChat((c) => [...c, { from: 'me', text: userText }, { from: 'bot', text: botReply }]);
    if (!text) setMsg('');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="grain pointer-events-none fixed inset-0 opacity-[0.05] z-0" />
      <div className="pointer-events-none fixed -top-40 -right-40 w-[34rem] h-[34rem] rounded-full bg-accent/20 blur-3xl z-0" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-secondary/20 blur-3xl z-0" />

      {/* Header */}
      <header className="relative z-20 sticky top-0 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center overflow-hidden">
              <img src="https://cdn.poehali.dev/projects/75c7bfbb-449a-496c-8281-98107283b3f9/bucket/23afddee-becb-4deb-9040-eb547f906bb5.jpg" alt="GreenTeam" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-none">GreenTeam_2.0</div>
              <div className="text-xs text-muted-foreground mt-0.5">портал команды</div>
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-1 bg-muted/60 rounded-full p-1.5">
            {nav.map((n) => (
              <button key={n.id} onClick={() => setActive(n.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${active === n.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon name={n.icon} size={16} />{n.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button className="relative w-11 h-11 rounded-2xl bg-muted flex items-center justify-center hover:bg-accent/15 transition-colors">
              <Icon name="Bell" size={18} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
            </button>
            <Avatar className="border-2 border-primary"><AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">Я</AvatarFallback></Avatar>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container pt-14 pb-10">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 animate-fade-up">
            <Badge className="bg-accent/15 text-accent border-0 mb-5 rounded-full px-4 py-1.5 hover:bg-accent/15">
              <Icon name="Sparkles" size={14} className="mr-1.5" /> Всё о жизни команды в одном месте
            </Badge>
            <h1 className="font-display font-extrabold text-5xl md:text-6xl leading-[1.02] tracking-tight">
              Добро <span className="text-primary">пожаловать</span><br />в GreenTeam_2.0
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-xl">
              Новости из Telegram, дни рождения коллег, мероприятия и умный помощник для новичков — собрали важное на одной странице.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button size="lg" className="rounded-full h-12 px-7 text-base font-semibold hover-lift" onClick={() => {
                setActive('feed');
                setTimeout(() => document.getElementById('feed-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}>
                <Icon name="Compass" size={18} className="mr-2" /> Открыть ленту
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-12 px-7 text-base font-semibold border-2 hover-lift" onClick={() => setActive('helper')}>
                <Icon name="MessageCircleHeart" size={18} className="mr-2" /> Спросить помощника
              </Button>
            </div>
            <div className="flex items-center gap-6 mt-10">
              {[['148', 'коллег'], ['12', 'событий в июне'], ['3', 'дня рождения']].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display font-bold text-2xl text-primary">{n}</div>
                  <div className="text-sm text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/10 rounded-[2.5rem] rotate-3" />
              <img src={HERO_IMG} alt="Команда" className="relative rounded-[2rem] w-full object-cover aspect-square shadow-2xl" />
              <div className="absolute -bottom-5 -left-5 bg-card rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-float">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center"><Icon name="Cake" className="text-primary" size={20} /></div>
                <div><div className="text-sm font-semibold">Сегодня ДР</div><div className="text-xs text-muted-foreground">у Анны Беловой</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <main className="relative z-10 container pb-24 grid lg:grid-cols-3 gap-6 mt-6">
        {/* Feed */}
        <div id="feed-section" className="lg:col-span-2 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <SectionHead icon="Newspaper" title="Лента событий" subtitle={tgPosts.length ? 'Прямой эфир из @moeGT22' : 'Новости из Telegram и анонсы'} />
            <div className="flex items-center gap-2 mt-1">
              <span className={`relative flex h-2.5 w-2.5`}>
                <span className={`${pulse ? 'animate-ping' : 'animate-[ping_2s_ease-in-out_infinite]'} absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75`} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
              </span>
              <span className="text-xs text-muted-foreground">
                {lastUpdated ? `обновлено ${timeAgo(lastUpdated.toISOString())}` : 'загрузка...'}
              </span>
            </div>
          </div>
          {tgPosts.length > 0 ? (
            tgPosts.map((p, i) => {
              const lines = p.text ? p.text.split('\n').filter(Boolean) : [];
              const isVideo = p.mediaType === 'video';
              const isGif = p.mediaType === 'animation';
              const isPhoto = p.mediaType === 'photo';
              const isVoice = p.mediaType === 'voice';
              const isDoc = p.mediaType === 'document';
              const isSticker = p.mediaType === 'sticker';

              const mediaBadgeLabel: Record<string, string> = { photo: 'Фото', video: 'Видео', animation: 'GIF', voice: 'Голосовое', document: 'Документ', sticker: 'Стикер' };
              const mediaBadgeIcon: Record<string, string> = { photo: 'Image', video: 'Video', animation: 'Zap', voice: 'Mic', document: 'FileText', sticker: 'Smile' };

              return (
                <Card key={p.id} className="rounded-3xl border-border hover-lift bg-card animate-fade-up overflow-hidden" style={{ animationDelay: `${i * 0.08}s` }}>

                  {/* ВИДЕО — встроенный плеер */}
                  {isVideo && p.mediaFileUrl && (
                    <div className="relative w-full bg-black overflow-hidden rounded-t-3xl" style={{ maxHeight: '420px' }}>
                      <video
                        src={p.mediaFileUrl}
                        poster={p.mediaUrl || undefined}
                        controls
                        preload="metadata"
                        className="w-full max-h-[420px] object-contain"
                      />
                    </div>
                  )}
                  {/* Видео без файла — превью+кнопка */}
                  {isVideo && !p.mediaFileUrl && p.mediaUrl && (
                    <div className="relative w-full overflow-hidden rounded-t-3xl bg-black" style={{ maxHeight: '360px' }}>
                      <img src={p.mediaUrl} alt="" className="w-full object-cover opacity-70" style={{ maxHeight: '360px' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl"><Icon name="Play" size={28} className="text-foreground ml-1" /></div>
                      </div>
                    </div>
                  )}

                  {/* GIF — автовоспроизведение */}
                  {isGif && p.mediaFileUrl && (
                    <div className="relative w-full overflow-hidden rounded-t-3xl bg-black" style={{ maxHeight: '360px' }}>
                      <video
                        src={p.mediaFileUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full max-h-[360px] object-contain"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-black/60 text-white border-0 rounded-full text-xs backdrop-blur-sm">GIF</Badge>
                      </div>
                    </div>
                  )}
                  {isGif && !p.mediaFileUrl && p.mediaUrl && (
                    <div className="relative w-full overflow-hidden rounded-t-3xl" style={{ maxHeight: '360px' }}>
                      <img src={p.mediaUrl} alt="" className="w-full object-cover" style={{ maxHeight: '360px' }} />
                    </div>
                  )}

                  {/* ФОТО */}
                  {isPhoto && p.mediaUrl && (
                    <div className="w-full overflow-hidden rounded-t-3xl" style={{ maxHeight: '420px' }}>
                      <img
                        src={p.mediaUrl}
                        alt=""
                        className="w-full object-cover cursor-pointer"
                        style={{ maxHeight: '420px' }}
                        onClick={() => window.open(p.mediaFileUrl || p.mediaUrl!, '_blank')}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* СТИКЕР */}
                  {isSticker && p.mediaUrl && (
                    <div className="flex justify-center pt-5 px-5">
                      <img src={p.mediaUrl} alt="sticker" className="w-40 h-40 object-contain" />
                    </div>
                  )}

                  {/* Голосовое */}
                  {isVoice && p.mediaFileUrl && (
                    <div className="px-6 pt-5">
                      <div className="rounded-2xl bg-muted p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                          <Icon name="Mic" size={18} className="text-secondary" />
                        </div>
                        <audio controls src={p.mediaFileUrl} className="flex-1 h-8" style={{ minWidth: 0 }} />
                      </div>
                    </div>
                  )}

                  {/* Документ */}
                  {isDoc && (
                    <div className="px-6 pt-5">
                      <a href={p.mediaFileUrl || '#'} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 rounded-2xl bg-muted p-4 hover:bg-accent/10 transition-colors">
                        {p.mediaUrl
                          ? <img src={p.mediaUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                          : <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center"><Icon name="FileText" size={22} className="text-accent" /></div>
                        }
                        <div>
                          <div className="text-sm font-semibold">Документ</div>
                          <div className="text-xs text-muted-foreground">Нажмите для скачивания</div>
                        </div>
                        <Icon name="Download" size={16} className="ml-auto text-muted-foreground" />
                      </a>
                    </div>
                  )}

                  {/* Подпись и мета */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className="bg-secondary/20 text-secondary border-0 rounded-full text-xs gap-1">
                        <Icon name="Send" size={11} /> Telegram
                      </Badge>
                      {p.mediaType && (
                        <Badge className="bg-muted text-muted-foreground border-0 rounded-full text-xs gap-1">
                          <Icon name={mediaBadgeIcon[p.mediaType] || 'File'} size={11} />
                          {mediaBadgeLabel[p.mediaType] || p.mediaType}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{p.channel} · {timeAgo(p.postedAt)}</span>
                    </div>
                    {lines.length > 0 && (
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{lines.join('\n')}</p>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            feed.map((f, i) => (
              <Card key={i} className="p-6 rounded-3xl border-border hover-lift cursor-pointer bg-card animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-muted flex items-center justify-center"><Icon name={f.icon} size={20} /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className={`${f.tagColor} border-0 rounded-full text-xs`}>{f.tag}</Badge>
                      <span className="text-xs text-muted-foreground">{f.author} · {f.time}</span>
                    </div>
                    <h3 className="font-display font-semibold text-lg leading-snug">{f.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1.5">{f.text}</p>
                  </div>
                </div>
              </Card>
            ))
          )}

          {/* Team */}
          <div className="pt-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <SectionHead icon="Users" title="Команда" subtitle={`${employees.length} сотрудников в базе`} />
              <Button size="sm" className="rounded-full gap-2" onClick={() => setShowAddForm((v) => !v)}>
                <Icon name={showAddForm ? 'X' : 'UserPlus'} size={15} />
                {showAddForm ? 'Отмена' : 'Добавить'}
              </Button>
            </div>

            {/* Вкладки дирекций */}
            <div className="flex gap-2 flex-wrap mb-4">
              {['Все', ...DEPARTMENTS].map((d) => {
                const count = d === 'Все' ? employees.length : employees.filter((e) => e.department === d).length;
                return (
                  <button key={d} onClick={() => setActiveDept(d)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border ${activeDept === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40'}`}>
                    {d}
                    <span className={`ml-1.5 text-xs ${activeDept === d ? 'opacity-80' : 'opacity-50'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {showAddForm && (
              <Card className="p-5 rounded-3xl border-primary/30 bg-primary/5 mb-4 animate-fade-up">
                <div className="flex items-start gap-4 mb-4">
                  {/* Фото-пикер */}
                  <label className="cursor-pointer shrink-0 group">
                    <div className="w-20 h-20 rounded-2xl bg-muted border-2 border-dashed border-border group-hover:border-primary transition-colors overflow-hidden flex items-center justify-center">
                      {newEmpPhoto
                        ? <img src={newEmpPhoto} className="w-full h-full object-cover" alt="" />
                        : <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <Icon name="Camera" size={20} />
                            <span className="text-[10px]">Фото</span>
                          </div>
                      }
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  </label>
                  <div className="flex-1 grid sm:grid-cols-2 gap-3">
                    <Input placeholder="Имя и фамилия *" value={newEmp.name} onChange={(e) => setNewEmp((p) => ({ ...p, name: e.target.value }))} className="rounded-2xl" />
                    <Input placeholder="Должность" value={newEmp.role} onChange={(e) => setNewEmp((p) => ({ ...p, role: e.target.value }))} className="rounded-2xl" />
                    <Input type="email" placeholder="Email" value={newEmp.email} onChange={(e) => setNewEmp((p) => ({ ...p, email: e.target.value }))} className="rounded-2xl" />
                    <Input placeholder="@telegram" value={newEmp.tgUsername} onChange={(e) => setNewEmp((p) => ({ ...p, tgUsername: e.target.value }))} className="rounded-2xl" />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground pl-1">Дата рождения *</label>
                      <Input type="date" value={newEmp.birthday} onChange={(e) => setNewEmp((p) => ({ ...p, birthday: e.target.value }))} className="rounded-2xl" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground pl-1">Пришёл в компанию</label>
                      <Input type="date" value={newEmp.joinedAt} onChange={(e) => setNewEmp((p) => ({ ...p, joinedAt: e.target.value }))} className="rounded-2xl" />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs text-muted-foreground pl-1">Дирекция</label>
                      <select value={newEmp.department} onChange={(e) => setNewEmp((p) => ({ ...p, department: e.target.value }))}
                        className="rounded-2xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">— Выберите дирекцию —</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <Button className="rounded-full w-full" onClick={addEmployee} disabled={!newEmp.name || !newEmp.birthday}>
                  <Icon name="Check" size={15} className="mr-2" /> Сохранить сотрудника
                </Button>
              </Card>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {empLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-5 rounded-3xl border-border bg-card animate-pulse">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-16 h-16 rounded-2xl bg-muted shrink-0" />
                      <div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded-full w-3/4" /><div className="h-3 bg-muted rounded-full w-1/2" /></div>
                    </div>
                    <div className="h-3 bg-muted rounded-full w-full mt-2" />
                  </Card>
                ))
              ) : (
                employees.filter((m) => activeDept === 'Все' || m.department === activeDept).map((m) => (
                  <Card key={m.id} className="rounded-3xl border-border hover-lift bg-card overflow-hidden group">
                    {/* Верхняя часть с фото */}
                    <div className="relative">
                      <label className="cursor-pointer block">
                        {m.photoUrl
                          ? <img src={m.photoUrl} alt={m.name} className="w-full h-36 object-cover object-top" />
                          : <div className="w-full h-36 bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center">
                              <span className="font-display font-bold text-3xl text-accent/60">{initials(m.name)}</span>
                            </div>
                        }
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/90 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium">
                            <Icon name="Camera" size={13} /> Изменить фото
                          </div>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const r = new FileReader();
                          r.onload = (ev) => uploadPhoto(m.id, ev.target?.result as string);
                          r.readAsDataURL(f);
                        }} />
                      </label>
                      {/* Бейдж дней в компании */}
                      {m.daysInCompany !== null && (
                        <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-center shadow-sm">
                          <div className="font-display font-bold text-sm text-primary leading-none">{m.daysInCompany}</div>
                          <div className="text-[9px] text-muted-foreground leading-none mt-0.5">дней</div>
                        </div>
                      )}
                      <button
                        onClick={() => deleteEmployee(m.id)}
                        className="absolute top-2 left-2 w-7 h-7 rounded-xl bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Icon name="Trash2" size={13} />
                      </button>
                    </div>
                    {/* Информация */}
                    <div className="p-4">
                      <div className="font-display font-semibold truncate">{m.name}</div>
                      {m.role && <div className="text-sm text-muted-foreground mt-0.5">{m.role}</div>}
                      {m.department && <Badge className="mt-1.5 bg-primary/10 text-primary border-0 rounded-full text-xs">{m.department}</Badge>}
                      <div className="mt-3 space-y-1.5">
                        {m.email && (
                          <a href={`mailto:${m.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Icon name="Mail" size={12} className="shrink-0" /><span className="truncate">{m.email}</span>
                          </a>
                        )}
                        {m.tgUsername && (
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <Icon name="Send" size={12} className="shrink-0" /><span>{m.tgUsername}</span>
                          </div>
                        )}
                        {m.birthday && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Icon name="Cake" size={12} className="shrink-0" /><span>{formatBirthday(m.birthday)}</span>
                          </div>
                        )}
                        {m.joinedAt && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Icon name="CalendarCheck" size={12} className="shrink-0" />
                            <span>в компании с {new Date(m.joinedAt + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Birthday controls */}
            <Card className="mt-4 p-5 rounded-3xl border-border bg-card">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center"><Icon name="Cake" className="text-primary" size={20} /></div>
                  <div>
                    <div className="font-semibold">Авто-поздравления</div>
                    <div className="text-sm text-muted-foreground">Бот пишет в @moeGT22 в день рождения</div>
                  </div>
                </div>
                <Button onClick={runGreetings} disabled={greetLoading} variant="outline" className="rounded-full gap-2">
                  <Icon name={greetLoading ? 'Loader' : 'Send'} size={16} className={greetLoading ? 'animate-spin' : ''} />
                  {greetLoading ? 'Проверяю...' : 'Запустить сейчас'}
                </Button>
              </div>
              {greetStatus && (
                <div className="mt-3 rounded-2xl bg-secondary/10 px-4 py-3 text-sm text-foreground animate-fade-up">
                  {greetStatus}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Calendar */}
          <Card className="p-6 rounded-3xl border-border bg-card">
            <SectionHead icon="CalendarHeart" title="Календарь" subtitle="Дни рождения" small />
            <div className="space-y-3 mt-4">
              {employees.length === 0 && !empLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">Добавьте сотрудников в команду</p>
              )}
              {employees
                .slice()
                .sort((a, b) => {
                  const now = new Date();
                  const toNext = (iso: string) => {
                    const d = new Date(iso + 'T00:00:00');
                    const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
                    if (next < now) next.setFullYear(now.getFullYear() + 1);
                    return next.getTime();
                  };
                  return toNext(a.birthday) - toNext(b.birthday);
                })
                .slice(0, 5)
                .map((emp) => {
                  const d = new Date(emp.birthday + 'T00:00:00');
                  const today = new Date();
                  const isToday = d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
                  const MONTHS = ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'];
                  return (
                    <div key={emp.id} className="flex items-center gap-3 group cursor-pointer">
                      <div className={`${isToday ? 'bg-primary' : 'bg-muted'} ${isToday ? 'text-primary-foreground' : 'text-foreground'} rounded-2xl w-14 h-14 shrink-0 flex flex-col items-center justify-center leading-none`}>
                        <span className="font-display font-bold text-lg">{d.getDate()}</span>
                        <span className="text-[10px] opacity-80 mt-0.5">{MONTHS[d.getMonth()]}</span>
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-semibold group-hover:text-primary transition-colors ${isToday ? 'text-primary' : ''}`}>{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{isToday ? '🎉 Сегодня!' : 'День рождения'}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-5 rounded-2xl bg-primary/10 p-4 flex items-start gap-3">
              <Icon name="BellRing" className="text-primary shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-foreground/80">Авто-напоминания о днях рождения включены. Бот сам поздравит коллег 🎉</p>
            </div>
          </Card>

          {/* Helper */}
          <Card className="p-6 rounded-3xl border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <img src={BOT_IMG} alt="Бот" className="w-12 h-12 rounded-2xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold">Помощник новичка</div>
                <div className="text-xs text-secondary flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-secondary" /> онлайн</div>
              </div>
              <a href="https://t.me/green_team_2_0_bot" target="_blank" rel="noreferrer"
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium bg-secondary/15 text-secondary rounded-full px-3 py-1.5 hover:bg-secondary/25 transition-colors">
                <Icon name="Send" size={12} /> @green_team_2_0_bot
              </a>
            </div>

            {/* Приветственный баннер */}
            <a href="https://t.me/green_team_2_0_bot" target="_blank" rel="noreferrer" className="block mb-4 rounded-2xl overflow-hidden hover:opacity-90 transition-opacity">
              <img
                src="https://cdn.poehali.dev/projects/75c7bfbb-449a-496c-8281-98107283b3f9/bucket/23afddee-becb-4deb-9040-eb547f906bb5.jpg"
                alt="Добро пожаловать в GreenTeam"
                className="w-full object-cover"
                style={{ maxHeight: '120px' }}
              />
            </a>

            <div className="space-y-2.5 max-h-52 overflow-y-auto mb-3 pr-1">
              {chat.map((c, i) => (
                <div key={i} className={`flex ${c.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] text-sm px-3.5 py-2.5 rounded-2xl whitespace-pre-line ${c.from === 'me' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}>{c.text}</div>
                </div>
              ))}
            </div>

            {/* Быстрые кнопки */}
            {chat.length < 3 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {quickReplies.map((q) => (
                  <button key={q.label} onClick={() => send(q.label)}
                    className="text-xs bg-muted hover:bg-primary/10 hover:text-primary border border-border rounded-full px-3 py-1.5 transition-colors text-left">
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Задайте вопрос..." className="rounded-full bg-muted border-0" />
              <Button size="icon" className="rounded-full shrink-0" onClick={() => send()}><Icon name="ArrowUp" size={18} /></Button>
            </div>

            <a href="https://t.me/green_team_2_0_bot" target="_blank" rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-secondary transition-colors">
              <Icon name="ExternalLink" size={12} /> Открыть полный чат-бот в Telegram
            </a>
          </Card>

          {/* Onboarding */}
          <Card className="p-6 rounded-3xl border-border bg-card">
            <SectionHead icon="Rocket" title="Новичку" subtitle="Всё для быстрого старта" small />
            <div className="space-y-3">
              {/* Первые шаги */}
              <div className="rounded-2xl bg-primary/8 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">🚀</span>
                  <span className="text-sm font-semibold">Первые шаги</span>
                </div>
                <ol className="space-y-1.5">
                  {[
                    'Напиши /start боту @green_team_2_0_bot',
                    'Познакомься с командой в разделе «Команда»',
                    'Загляни в «Сервисы» — там все инструменты',
                    'Подпишись на корпоративный Telegram-канал',
                    'Заполни свой профиль сотрудника',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <span className="shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Инструменты */}
              <div className="rounded-2xl bg-muted/60 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">🛠</span>
                  <span className="text-sm font-semibold">Инструменты команды</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { icon: 'Send', label: 'Telegram', desc: 'основной канал общения' },
                    { icon: 'FileText', label: 'Notion', desc: 'база знаний и регламенты' },
                    { icon: 'Mail', label: 'Корп. почта', desc: 'официальная переписка' },
                    { icon: 'Bot', label: '@green_team_2_0_bot', desc: 'помощник и онбординг' },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center gap-2 text-xs">
                      <Icon name={t.icon} size={13} className="text-secondary shrink-0" />
                      <span className="font-medium">{t.label}</span>
                      <span className="text-muted-foreground">— {t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ценности */}
              <div className="rounded-2xl bg-accent/8 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">💚</span>
                  <span className="text-sm font-semibold">Ценности команды</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    ['🌿', 'Экологичность', 'думаем о людях и планете'],
                    ['🤝', 'Честность', 'открытость во всём'],
                    ['🚀', 'Развитие', 'учимся и растём вместе'],
                    ['💪', 'Результат', 'доводим до конца'],
                    ['❤️', 'Забота', 'о коллегах и клиентах'],
                  ].map(([emoji, name, desc]) => (
                    <div key={name} className="flex items-center gap-2 text-xs">
                      <span>{emoji}</span>
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">— {desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <a href="https://t.me/green_team_2_0_bot" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 text-xs font-medium bg-secondary/15 text-secondary rounded-full px-4 py-2.5 hover:bg-secondary/25 transition-colors">
                <Icon name="Send" size={13} /> Открыть бота в Telegram
              </a>
            </div>
          </Card>

          {/* FAQ */}
          <Card className="p-6 rounded-3xl border-border bg-card">
            <SectionHead icon="CircleHelp" title="Частые вопросы" small />
            <div className="space-y-3 mt-3">
              {faq.map((f, i) => (
                <details key={i} className="group rounded-2xl bg-muted/60 p-3.5 cursor-pointer">
                  <summary className="flex items-center justify-between text-sm font-medium list-none">{f.q}<Icon name="ChevronDown" size={16} className="group-open:rotate-180 transition-transform" /></summary>
                  <p className="text-xs text-muted-foreground mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </Card>
        </aside>

        {/* Integrations full width */}
        <div className="lg:col-span-3 pt-4">
          <SectionHead icon="Plug" title="Сервисы и уведомления" subtitle="Подключение Telegram и центр напоминаний" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {integrations.map((it, i) => (
              <Card key={i} className="p-6 rounded-3xl border-border bg-card hover-lift">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${it.on ? 'bg-secondary/15 text-secondary' : 'bg-muted text-muted-foreground'}`}><Icon name={it.icon} size={22} /></div>
                  <span className={`w-3 h-3 rounded-full ${it.on ? 'bg-secondary' : 'bg-muted-foreground/40'}`} />
                </div>
                <div className="font-display font-semibold">{it.name}</div>
                <div className="text-sm text-muted-foreground mb-4">{it.desc}</div>
                <Button variant={it.on ? 'outline' : 'default'} className="w-full rounded-full" size="sm">{it.status}</Button>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border bg-card/50">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Icon name="Rocket" size={16} className="text-primary" /> Орбита · портал команды</div>
          <div>Сделано с заботой о коллегах 🪐</div>
        </div>
      </footer>
    </div>
  );
};

const SectionHead = ({ icon, title, subtitle, small }: { icon: string; title: string; subtitle?: string; small?: boolean }) => (
  <div className="flex items-center gap-3 mb-4">
    <Icon name={icon} className="text-primary" size={small ? 18 : 22} />
    <div>
      <h2 className={`font-display font-bold ${small ? 'text-lg' : 'text-2xl'} leading-none`}>{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  </div>
);

export default Index;