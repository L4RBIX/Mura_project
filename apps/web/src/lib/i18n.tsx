"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { people as basePeople, stories as baseStories } from "@/data";
import type { Person, Story } from "@/lib/types";

export type Locale = "ru" | "kk";

const ui = {
  ru: {
    begin: "Начать",
    tagline: "Голос вашей семьи.\nНавсегда.",
    memoryLives: "Каждое воспоминание заслуживает жить.",
    goodMorning: "Доброе утро",
    goodAfternoon: "Добрый день",
    goodEvening: "Добрый вечер",
    todaysMemories: "Воспоминания сегодня",
    recordMemory: "Записать воспоминание",
    pressAndSpeak: "Нажмите и говорите",
    familyTree: "Семейное древо",
    recentRecordings: "Недавние записи",
    people: "человек",
    memories: "воспоминаний",
    new: "Новое",
    newMemory: "Новое воспоминание",
    startRecording: "Начать запись",
    rememberPrompt: "Расскажите так,\nкак вы это помните.",
    rememberHint: "Здесь нельзя вспоминать неправильно.\nПросто говорите.",
    listening: "Слушаю",
    liveTextUnavailable: "Аудио записывается. Живой текст недоступен в этом браузере.",
    speechRecognitionError: "Не удалось распознать речь. Аудиозапись продолжается.",
    restart: "Сначала",
    resume: "Продолжить",
    pause: "Пауза",
    finish: "Готово",
    uploading: "Отправляем запись…",
    microphoneError: "Не удалось открыть микрофон. Разрешите доступ и попробуйте снова.",
    uploadError: "Не удалось обработать запись. Попробуйте ещё раз.",
    noSpeechError: "Речь не распознана. Скажите несколько слов и попробуйте снова.",
    audioMemoryTitle: "Новая аудиозапись",
    transcriptUnavailable: "Текст не распознан, но аудиозапись сохранена.",
    noSavedMemories: "Здесь появятся ваши новые записи.",
    aiSummary: "Кратко",
    transcript: "Расшифровка",
    memoryNotFound: "Запись не найдена в этом браузере.",
    archiveOwnerSummary: "Здесь сохраняются ваши настоящие аудиозаписи и воспоминания.",
    processingListen: "Слушаем ещё раз…",
    processingPeople: "Находим людей…",
    processingPlace: "Добавляем в историю семьи…",
    processingSafe: "Ваши слова в безопасности. Нужно немного времени.",
    processingFailed: "Обработка не завершилась. Проверьте Mura API и ASR worker.",
    yourFamily: "Ваша семья",
    familyOf: "Семья: {name}",
    newMemoryPlaced: "Новое воспоминание добавлено",
    treeHint: "Перетаскивайте · масштабируйте · нажмите на человека",
    centerTree: "Центрировать древо",
    noMemoriesYet: "Пока нет воспоминаний",
    oneMemory: "1 воспоминание",
    memoriesCount: "{count} воспоминаний",
    oneMemoryRecorded: "Записано 1 воспоминание",
    memoriesRecorded: "Записано воспоминаний: {count}",
    openProfile: "Открыть профиль",
    centerHere: "Поставить в центр",
    hideParents: "Скрыть родителей: {name}",
    showParents: "Показать родителей: {name}",
    hideChildren: "Скрыть детей: {name}",
    showChildren: "Показать детей: {name}",
    memory: "Воспоминание",
    toldBy: "Рассказала {name}",
    inThisMemory: "В этом воспоминании",
    listen: "Слушать",
    play: "Воспроизвести",
    pauseAudio: "Пауза",
    born: "Год рождения: {year}",
    memoriesTold: "Воспоминания, рассказанные {name}",
    noMention: "Пока нет воспоминаний о {name}.",
    nextMention: "Когда в следующий раз будете говорить о {name}, нажмите запись.",
    recordAMemory: "Записать воспоминание",
    relationOf: "{relation} для {name}",
    goBack: "Назад",
    father: "Отец",
    mother: "Мать",
    husband: "Муж",
    wife: "Жена",
    brother: "Брат",
    sister: "Сестра",
    son: "Сын",
    daughter: "Дочь",
    grandfather: "Дедушка",
    grandmother: "Бабушка",
    grandson: "Внук",
    granddaughter: "Внучка",
  },
  kk: {
    begin: "Бастау",
    tagline: "Отбасыңыздың дауысы.\nМәңгілікке.",
    memoryLives: "Әрбір естелік өмір сүруге лайық.",
    goodMorning: "Қайырлы таң",
    goodAfternoon: "Қайырлы күн",
    goodEvening: "Қайырлы кеш",
    todaysMemories: "Бүгінгі естеліктер",
    recordMemory: "Естелік жазу",
    pressAndSpeak: "Басыңыз да, сөйлей беріңіз",
    familyTree: "Отбасы шежіресі",
    recentRecordings: "Соңғы жазбалар",
    people: "адам",
    memories: "естелік",
    new: "Жаңа",
    newMemory: "Жаңа естелік",
    startRecording: "Жазуды бастау",
    rememberPrompt: "Қалай есіңізде болса,\nсолай айтыңыз.",
    rememberHint: "Еске алудың қате жолы жоқ.\nТек сөйлей беріңіз.",
    listening: "Тыңдап тұрмын",
    liveTextUnavailable: "Аудио жазылып жатыр. Бұл браузерде тікелей мәтін қолжетімсіз.",
    speechRecognitionError: "Сөйлеуді тану мүмкін болмады. Аудио жазу жалғасуда.",
    restart: "Қайта бастау",
    resume: "Жалғастыру",
    pause: "Кідірту",
    finish: "Аяқтау",
    uploading: "Жазба жіберіліп жатыр…",
    microphoneError: "Микрофон ашылмады. Рұқсат беріп, қайта көріңіз.",
    uploadError: "Жазбаны өңдеу мүмкін болмады. Қайта көріңіз.",
    noSpeechError: "Сөйлеу танылмады. Бірнеше сөз айтып, қайта көріңіз.",
    audioMemoryTitle: "Жаңа аудиожазба",
    transcriptUnavailable: "Мәтін танылмады, бірақ аудиожазба сақталды.",
    noSavedMemories: "Жаңа жазбаларыңыз осында пайда болады.",
    aiSummary: "Қысқаша",
    transcript: "Мәтін",
    memoryNotFound: "Бұл браузерде жазба табылмады.",
    archiveOwnerSummary: "Мұнда сіздің нақты аудиожазбаларыңыз бен естеліктеріңіз сақталады.",
    processingListen: "Тағы бір рет тыңдап жатырмыз…",
    processingPeople: "Адамдарды тауып жатырмыз…",
    processingPlace: "Отбасы тарихына қосып жатырмыз…",
    processingSafe: "Сөздеріңіз қауіпсіз. Аз ғана уақыт қажет.",
    processingFailed: "Өңдеу аяқталмады. Mura API мен ASR worker-ді тексеріңіз.",
    yourFamily: "Сіздің отбасыңыз",
    familyOf: "{name} отбасы",
    newMemoryPlaced: "Жаңа естелік қосылды",
    treeHint: "Жылжытыңыз · масштабтаңыз · адамды түртіңіз",
    centerTree: "Шежірені ортаға келтіру",
    noMemoriesYet: "Әзірге естелік жоқ",
    oneMemory: "1 естелік",
    memoriesCount: "{count} естелік",
    oneMemoryRecorded: "1 естелік жазылған",
    memoriesRecorded: "{count} естелік жазылған",
    openProfile: "Профильді ашу",
    centerHere: "Ортаға қою",
    hideParents: "{name} ата-анасын жасыру",
    showParents: "{name} ата-анасын көрсету",
    hideChildren: "{name} балаларын жасыру",
    showChildren: "{name} балаларын көрсету",
    memory: "Естелік",
    toldBy: "Айтқан: {name}",
    inThisMemory: "Бұл естелікте",
    listen: "Тыңдау",
    play: "Ойнату",
    pauseAudio: "Кідірту",
    born: "Туған жылы: {year}",
    memoriesTold: "{name} айтқан естеліктер",
    noMention: "{name} туралы әзірге естелік жоқ.",
    nextMention: "Келесіде {name} туралы айтқанда, жазу түймесін басыңыз.",
    recordAMemory: "Естелік жазу",
    relationOf: "{name} үшін: {relation}",
    goBack: "Артқа",
    father: "Әкесі",
    mother: "Анасы",
    husband: "Күйеуі",
    wife: "Жұбайы",
    brother: "Ағасы/інісі",
    sister: "Әпкесі/сіңлісі",
    son: "Ұлы",
    daughter: "Қызы",
    grandfather: "Атасы",
    grandmother: "Әжесі",
    grandson: "Немересі",
    granddaughter: "Немересі",
  },
} as const;

export type TranslationKey = keyof (typeof ui)["ru"];

const personText: Record<Locale, Record<string, Pick<Person, "relation" | "summary" | "summaryHighlight">>> = {
  ru: {
    sabyr: { relation: "Мой отец", summary: "Бабушка помнит его тихим человеком с землёй яблоневого сада на руках. Он верил: дерево помнит каждого, кто его поливает.", summaryHighlight: "дерево помнит каждого, кто его поливает" },
    bibigul: { relation: "Моя мать", summary: "Бабушка помнит её как тепло дома: хлеб по четвергам, тёплая буханка для соседей и песня во время работы.", summaryHighlight: "тепло дома" },
    aisulu: { relation: "Бабушка", summary: "Хранительница этого архива. Каждое воспоминание здесь звучит её голосом — обычно из кресла у кухонного окна.", summaryHighlight: "звучит её голосом" },
    bolat: { relation: "Мой брат", summary: "Младший брат Айсулу уехал на север работать на железной дороге и пишет дважды в год — всегда тем же спокойным почерком.", summaryHighlight: "пишет дважды в год" },
    marat: { relation: "Мой муж", summary: "Бабушка помнит его мальчиком на синем велосипеде, всё лето кружившим у её ворот, а потом оставшимся рядом на пятьдесят лет.", summaryHighlight: "мальчиком на синем велосипеде" },
    dana: { relation: "Моя дочь", summary: "Бабушка помнит, как в первый школьный день она шла впереди, слишком гордая, чтобы держаться за руку, и лишь раз обернулась.", summaryHighlight: "лишь раз обернулась" },
    timur: { relation: "Мой сын", summary: "Бабушка помнит его как смех за столом — мальчика, разбивавшего пиалу каждый Наурыз и однажды помявшего самовар.", summaryHighlight: "смех за столом" },
    aruzhan: { relation: "Моя внучка", summary: "Та, кто просит рассказывать истории. Однажды Аружан установила Mura на телефон бабушки — и теперь ничего не потеряется.", summaryHighlight: "просит рассказывать истории" },
    alikhan: { relation: "Мой внук", summary: "Бабушкин помощник в саду. Каждую весну они сажают саженцы апорта, а осенью спорят, кто их поливал.", summaryHighlight: "помощник в саду" },
  },
  kk: {
    sabyr: { relation: "Менің әкем", summary: "Әжем оны қолында алма бағының топырағы қалатын сабырлы адам ретінде еске алады. Ол ағаш өзін суарған әр адамды есте сақтайды деп сенетін.", summaryHighlight: "ағаш өзін суарған әр адамды есте сақтайды" },
    bibigul: { relation: "Менің анам", summary: "Әжем оны үйдің жылуы деп еске алады: бейсенбілік нан, көршілерге арналған жылы бөлке және жұмыс үстіндегі ән.", summaryHighlight: "үйдің жылуы" },
    aisulu: { relation: "Әже", summary: "Осы мұрағаттың сақтаушысы. Мұндағы әр естелік оның дауысымен, көбіне асүй терезесінің жанындағы орындықтан айтылады.", summaryHighlight: "оның дауысымен" },
    bolat: { relation: "Менің інім", summary: "Айсұлудың теміржолда жұмыс істеу үшін солтүстікке кеткен інісі жылына екі рет бірқалыпты, асықпайтын жазуымен хат жазады.", summaryHighlight: "жылына екі рет" },
    marat: { relation: "Менің күйеуім", summary: "Әжем оны жаз бойы қақпасының жанын айналған көк велосипедті бала, кейін елу жыл жанында қалған жары ретінде еске алады.", summaryHighlight: "көк велосипедті бала" },
    dana: { relation: "Менің қызым", summary: "Әжем оның мектепке алғаш барған күні қол ұстасуға намыстанып, алда жүргенін және бір-ақ рет артына бұрылғанын еске алады.", summaryHighlight: "бір-ақ рет артына бұрылғанын" },
    timur: { relation: "Менің ұлым", summary: "Әжем оны дастарқанның күлкісі деп еске алады — әр Наурызда бір кесе сындырып, бір жылы самаурынды майыстырған бала.", summaryHighlight: "дастарқанның күлкісі" },
    aruzhan: { relation: "Менің немерем", summary: "Әңгімелерді сұрайтын жан. Бір жексенбіде Аружан әжесінің телефонына Mura орнатты — енді ештеңе жоғалмайды.", summaryHighlight: "Әңгімелерді сұрайтын" },
    alikhan: { relation: "Менің немерем", summary: "Әжесінің бақтағы серігі. Әр көктемде олар апорт көшеттерін отырғызады, ал күзде кім суарғанын талқылайды.", summaryHighlight: "бақтағы серігі" },
  },
};

const storyText: Record<Locale, Record<string, Pick<Story, "title" | "era" | "recordedLabel" | "excerpt" | "paragraphs">>> = {
  ru: {
    "mothers-bread": { title: "Запах маминого хлеба", era: "Зима 1954 · приблизительно", recordedLabel: "Сегодня", excerpt: "Зима в тот год пришла рано, и мама каждый четверг пекла хлеб в круглой печи за домом.", paragraphs: ["Мне было шесть, может, семь. Зима пришла рано, снег доходил до окон. Моя мама Бибигуль каждый четверг пекла хлеб в круглой печи, которую отец построил за домом.", "Она отправляла меня к соседям с тёплой буханкой в полотенце. Руки одновременно горели и мёрзли. Вся улица знала: сегодня четверг.", "Больше я никогда не чувствовала такого запаха хлеба. Когда Дана была маленькой, я пыталась испечь так же. Но печь была не та, мука не та. Может, и зима была не та."] },
    "blue-bicycle": { title: "Синий велосипед Марата", era: "Лето 1963 · приблизительно", recordedLabel: "Вчера", excerpt: "На нашей улице был один велосипед, и принадлежал он Марату. Каждый вечер он четыре раза проезжал мимо ворот.", paragraphs: ["На нашей улице был один велосипед, и принадлежал он Марату. Синий, с серебряным звонком, который он каждое утро начищал как медаль.", "Каждый вечер он четыре раза проезжал мимо ворот. Сестра считала. На пятый вечер мой отец Сабыр остановил его у забора и спросил, не заблудился ли он.", "Он не заблудился. Через два года мы поженились. Велосипед стоял во дворе до года рождения Тимура."] },
    "apple-orchard": { title: "Яблоневый сад в Алматы", era: "Осень 1957 · приблизительно", recordedLabel: "Воскресенье", excerpt: "Отец работал в садах над городом, где яблоки апорт были больше моих ладоней.", paragraphs: ["Мой отец Сабыр работал в садах над городом, где яблоки апорт были больше двух моих ладоней.", "В сентябре он поднимал меня на плечи, чтобы я достала верхнюю ветку. Он говорил, что дерево помнит каждого, кто его поливает. Тогда я смеялась.", "Теперь я сажаю яблони за домом с Алиханом и уже не смеюсь. Я поливаю."] },
    "first-day-school": { title: "Первый школьный день Даны", era: "Сентябрь 1979", recordedLabel: "На прошлой неделе", excerpt: "Накануне вечером мы пришили к платью белый воротничок, а спала она прямо в бантах.", paragraphs: ["Накануне вечером мы пришили к платью белый воротничок, а спала она прямо в бантах, чтобы утром они не потерялись.", "Дана всю дорогу шла впереди. Она не хотела держать меня за руку — ей было семь, и она очень старалась быть взрослой.", "У школьных ворот она лишь раз обернулась проверить, что мы всё ещё там. Марат махал так, будто дом горит. Я до сих пор вижу этот поворот."] },
    "nauryz-table": { title: "Наурыз за нашим столом", era: "Весна 1985 · приблизительно", recordedLabel: "12 марта", excerpt: "На Наурыз стол должен был быть полным — таков закон нашего дома. Семь вкусов в коже.", paragraphs: ["На Наурыз стол должен был быть полным — таков закон нашего дома. Семь вкусов в коже и баурсаков на всех детей улицы.", "Тимур каждый год разбивал пиалу. Не знаю, как ему это удавалось. Однажды я дала ему металлическую, и тогда он помял самовар.", "Дверь не закрывалась с утра до вечера. Соседи входили без стука. Таким и должен быть дом — тёплым, шумным и пахнущим хлебом."] },
  },
  kk: {
    "mothers-bread": { title: "Анамның нанының иісі", era: "1954 жылдың қысы · шамамен", recordedLabel: "Бүгін", excerpt: "Сол жылы қыс ерте түсіп, анам әр бейсенбіде үйдің артындағы дөңгелек пеште нан пісіретін.", paragraphs: ["Мен алтыда, бәлкім жетіде едім. Қыс ерте түсіп, қар терезеге дейін жетті. Анам Бибігүл әр бейсенбіде әкем үйдің артына салған дөңгелек пеште нан пісіретін.", "Ол мені сүлгіге оралған жылы бөлкемен көршілерге жіберетін. Қолым бір мезетте күйіп те, тоңып та қалатын. Бүкіл көше бейсенбі екенін білетін.", "Содан бері ондай нан иісін сезбедім. Дана кішкентай кезде дәл солай пісіруге тырыстым. Бірақ пеш те, ұн да басқа еді. Мүмкін, қыс та басқа болған шығар."] },
    "blue-bicycle": { title: "Мараттың көк велосипеді", era: "1963 жылдың жазы · шамамен", recordedLabel: "Кеше", excerpt: "Біздің көшеде жалғыз велосипед болды, ол Мараттікі еді. Күнде кешке қақпамыздан төрт рет өтетін.", paragraphs: ["Біздің көшеде жалғыз велосипед болды, ол Мараттікі еді. Көк түсті, күміс қоңырауын күнде таңертең медальдай жылтырататын.", "Күнде кешке қақпамыздан төрт рет өтетін. Сіңлім санайтын. Бесінші кеште әкем Сабыр оны тоқтатып, адасып кеттің бе деп сұрады.", "Ол адаспапты. Екі жылдан кейін үйлендік. Велосипед Тимур туған жылға дейін аулада тұрды."] },
    "apple-orchard": { title: "Алматыдағы алма бағы", era: "1957 жылдың күзі · шамамен", recordedLabel: "Жексенбі", excerpt: "Әкем қала үстіндегі бақта жұмыс істейтін, онда апорт алмасы қос алақанымнан да үлкен болатын.", paragraphs: ["Әкем Сабыр қала үстіндегі бақта жұмыс істейтін, онда апорт алмасы қос алақанымнан да үлкен болатын.", "Қыркүйекте ең биік бұтаққа жетуім үшін мені иығына көтеретін. Ағаш өзін суарған әр адамды есте сақтайды дейтін. Ол кезде мен күлетінмін.", "Енді мен Әлиханмен үйдің артына алма ағаштарын отырғызамын, бірақ күлмеймін. Суарып жүрмін."] },
    "first-day-school": { title: "Дананың мектептегі алғашқы күні", era: "1979 жылдың қыркүйегі", recordedLabel: "Өткен аптада", excerpt: "Алдыңғы түні көйлегіне ақ жаға тігіп, ленталары жоғалмасын деп солармен ұйықтады.", paragraphs: ["Алдыңғы түні көйлегіне ақ жаға тігіп, ленталары таңға дейін жоғалмасын деп солармен ұйықтады.", "Дана жол бойы алдымызда жүрді. Қолымнан ұстағысы келмеді — жеті жаста болса да, өзін ересек сезінетін.", "Мектеп қақпасында біздің әлі тұрғанымызды көру үшін бір-ақ рет артына қарады. Марат үй өртенгендей қол бұлғады. Сол бұрылғаны әлі көз алдымда."] },
    "nauryz-table": { title: "Біздің дастарқандағы Наурыз", era: "1985 жылдың көктемі · шамамен", recordedLabel: "12 наурыз", excerpt: "Наурызда дастарқан толы болуы керек — үйіміздің заңы сол. Көжеде жеті дәм.", paragraphs: ["Наурызда дастарқан толы болуы керек — үйіміздің заңы сол. Көжеде жеті дәм, көшедегі әр балаға жететін бауырсақ.", "Тимур жыл сайын бір кесе сындыратын. Қалай істейтінін білмеймін. Бір жылы темір кесе берсем, оның орнына самаурынды майыстырды.", "Есік таңнан кешке дейін жабылмайтын. Көршілер қақпай кіретін. Үй дәл сондай — жылы, дауысты және нан иісті болуы керек."] },
  },
};

type ContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  people: Person[];
  stories: Story[];
  narrator: Person;
  getPerson: (id: string) => Person | undefined;
  getStory: (id: string) => Story | undefined;
  storiesForPerson: (id: string) => Story[];
  peopleInStory: (story: Story) => Person[];
  relationLabel: (centerId: string, targetId: string) => string;
  greetingForHour: (hour: number) => string;
  formatYears: (born: number, died?: number) => string;
};

const I18nContext = createContext<ContextValue | null>(null);

export function MuraI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    const stored = window.localStorage.getItem("mura-locale");
    if (stored === "ru" || stored === "kk") setLocaleState(stored);
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("mura-locale", next);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<ContextValue>(() => {
    const people = basePeople.map((person) => ({
      ...person,
      name: person.nativeName,
      ...personText[locale][person.id],
    }));
    const stories = baseStories.map((story) => ({ ...story, ...storyText[locale][story.id] }));
    const getPerson = (id: string) => people.find((person) => person.id === id);
    const getStory = (id: string) => stories.find((story) => story.id === id);
    const narrator = people.find((person) => person.isNarrator)!;
    const t = (key: TranslationKey, vars: Record<string, string | number> = {}) =>
      Object.entries(vars).reduce(
        (text, [name, replacement]) => text.replace(`{${name}}`, String(replacement)),
        ui[locale][key] as string,
      );
    const storiesForPerson = (id: string) =>
      id === narrator.id ? stories : stories.filter((story) => story.mentions.includes(id));
    const peopleInStory = (story: Story) =>
      story.mentions.map(getPerson).filter((person): person is Person => Boolean(person));

    const relationLabel = (centerId: string, targetId: string) => {
      const center = getPerson(centerId);
      const target = getPerson(targetId);
      if (!center || !target) return "";
      const gender = (male: TranslationKey, female: TranslationKey) =>
        t(target.gender === "m" ? male : female);
      if (target.parentIds.includes(centerId)) return gender("son", "daughter");
      if (center.parentIds.includes(targetId)) return gender("father", "mother");
      if (center.spouseId === targetId) return gender("husband", "wife");
      if (center.parentIds.some((id) => target.parentIds.includes(id)))
        return gender("brother", "sister");
      const centerParents = center.parentIds.map(getPerson).filter(Boolean) as Person[];
      if (centerParents.some((parent) => parent.parentIds.includes(targetId)))
        return gender("grandfather", "grandmother");
      const targetParents = target.parentIds.map(getPerson).filter(Boolean) as Person[];
      if (targetParents.some((parent) => parent.parentIds.includes(centerId)))
        return gender("grandson", "granddaughter");
      return target.relation;
    };
    const greetingForHour = (hour: number) =>
      t(hour < 12 ? "goodMorning" : hour < 18 ? "goodAfternoon" : "goodEvening");
    const formatYears = (born: number, died?: number) =>
      died ? `${born} – ${died}` : t("born", { year: born });
    return { locale, setLocale, t, people, stories, narrator, getPerson, getStory, storiesForPerson, peopleInStory, relationLabel, greetingForHour, formatYears };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useMuraI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useMuraI18n must be used inside MuraI18nProvider");
  return value;
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useMuraI18n();
  return (
    <div className="fixed right-[max(16px,calc((100vw-430px)/2+16px))] top-[max(env(safe-area-inset-top),14px)] z-[70] flex rounded-full bg-raised/90 p-1 shadow-soft backdrop-blur">
      {(["ru", "kk"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] transition-colors ${locale === item ? "bg-ink text-raised" : "text-muted"}`}
        >
          {item === "ru" ? "РУС" : "ҚАЗ"}
        </button>
      ))}
    </div>
  );
}
