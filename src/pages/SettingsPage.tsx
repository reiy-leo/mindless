import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

import {
  Clock,
  Cloud,
  Command,
  Contact,
  File,
  Film,
  Laptop,
  Layers,
  LayoutGrid,
  List,
  ListTodo,
  Moon,
  Palette,
  Paperclip,
  Settings,
  Sun,
  Table2,
  Type,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDisplayDate, formatTime, formatTimezoneOffset } from '@/lib/formatUtils'
import { showOverlay, TIMEZONE_PICKER_LABEL } from '@/lib/overlayManager'
import { getScreenRect } from '@/lib/screenRect'
import { formatThemeColorName, getThemeColorLabelKey, getThemePaletteLabelKey } from '@/lib/themePaletteLabels'
import { useCalendarEvents, useClearAllCalendarEvents, useImportCalendarEvents } from '@/queries/useTaskQueries'
import { checkAndNotify } from '@/services/notificationService'
import type {
  DateFormat,
  DefaultTaskSections,
  FontSize,
  SidebarMode,
  TimeFormat,
  TimezoneFormat,
} from '@/stores/useAppStore'
import { useAppStore } from '@/stores/useAppStore'
import type { PriorityMode, Theme } from '@/types'

const THEME_PALETTES2 = [
  {
    colors: [
      { hex: ['#144D29', '#C84B31', '#DCE6DD'], name: '端午节 (粽叶绿、雄黄橙、艾草青)' },
      { hex: ['#CD2026', '#D4AF37', '#FAECD1'], name: '春节 (大红灯笼、福运金、喜庆淡金)' },
      { hex: ['#3B5E2B', '#A31C26', '#FFEBEF'], name: '圣诞节 (圣诞松绿、冬日圣红、雪地圣白)' },
      { hex: ['#607D8B', '#4A6984', '#E0F2FA'], name: '清明节 (微雨烟灰、折柳青绿、晴空淡蓝)' },
      { hex: ['#B37D1D', '#1C2833', '#FCEFCE'], name: '中秋节 (玉兔月饼金、深空夜蓝、桂花淡黄)' },
      { hex: ['#E66800', '#31173B', '#FEF9DC'], name: '万圣节 (南瓜烈橙、巫师暗紫、幽灵莹黄)' },
      { hex: ['#A33B5D', '#F4C2C2', '#FDEAEA'], name: '情人节 (玫瑰深红、浪漫粉晶、告白淡粉)' },
      { hex: ['#8C5B2B', '#96C719', '#EBFCD4'], name: '劳动节 (泥土耕耘褐、麦穗新绿、晨曦浅绿)' },
      { hex: ['#E6AC0E', '#0B57D0', '#D3E3FD'], name: '儿童节 (童真向日葵、梦想纯蓝、气球浅蓝)' },
      { hex: ['#CD8378', '#5B6A77', '#DFECEF'], name: '感恩节 (火鸡烤栗、深秋沉稳灰、丰收暖米)' },
      { hex: ['#2E5894', '#16A085', '#DAF4F0'], name: '海洋日 (深海幽蓝、浅滩礁绿、浪花轻蓝)' },
      { hex: ['#7A5E94', '#E74C3C', '#FFE0FC'], name: '狂欢节 (假面魅紫、游行桑巴红、羽毛淡粉)' },
      { hex: ['#5F3A9C', '#FFE47E', '#EBE0FF'], name: '复活节 (复活节彩蛋紫、阳光暖黄、破壳嫩紫)' },
      { hex: ['#8A3324', '#008B8B', '#A6F1E6'], name: '泼水节 (陶罐红泥、澄澈池水蓝、飞溅水花青)' },
      { hex: ['#006A6A', '#B8530B', '#FFE9D6'], name: '重阳节 (茱萸苍翠、长寿菊橙、九九敬老暖橙)' },
    ],
    name: 'holidays',
  },
  {
    colors: [
      { hex: ['#1A3A70', '#0B57D0', '#D3E3FD'], name: '1 (经典蓝白)' },
      { hex: ['#4F5154', '#9E9E9E', '#E3E3E3'], name: '2 (风暴灰蓝)' },
      { hex: ['#112239', '#2A4D7E', '#B2CDFA'], name: '3 (午夜海军蓝)' },
      { hex: ['#253041', '#475266', '#D9E3FC'], name: '4 (冰川深灰)' },
      { hex: ['#2F363D', '#5B6A77', '#DFECEF'], name: '5 (莫兰迪石灰)' },
      { hex: ['#003838', '#008B8B', '#A6F1E6'], name: '6 (松石青绿)' },
      { hex: ['#1A3E0E', '#3F8A27', '#C4F1A6'], name: '7 (新芽嫩绿)' },
      { hex: ['#2D3129', '#5B6353', '#E1E4DC'], name: '8 (鼠尾草旷野绿)' },
      { hex: ['#423800', '#947C00', '#FFE47E'], name: '9 (向日葵沙滩黄)' },
      { hex: ['#542504', '#B8530B', '#FFDBCC'], name: '10 (晚霞蜜桃橙)' },
      { hex: ['#3D302C', '#7A6057', '#FCE2D6'], name: '11 (摩卡复古褐)' },
      { hex: ['#521B2D', '#A33B5D', '#FFE0E6'], name: '12 (玫瑰甜心粉)' },
      { hex: ['#3D2B2E', '#7A565C', '#FCE5E8'], name: '13 (暗香薄暮粉)' },
      { hex: ['#421A45', '#8E3D94', '#FFE0FC'], name: '14 (幻境薰衣草)' },
      { hex: ['#2C194C', '#5F3A9C', '#EBE0FF'], name: '15 (极光曜石紫)' },
    ],
    name: 'chrome_themes_15',
  },
  {
    colors: [
      { hex: ['#2B2A2A', '#1C1C1C', '#ECECEC'], name: '子鼠 (曜石黑)' },
      { hex: ['#7D694C', '#B0926A', '#F4ECE1'], name: '丑牛 (大麦黄)' },
      { hex: ['#A1790B', '#E6AC0E', '#FFF3CD'], name: '寅虎 (琥珀橙)' },
      { hex: ['#688A11', '#96C719', '#EBFCD4'], name: '卯兔 (薄荷绿)' },
      { hex: ['#8C7324', '#C9A534', '#FAEDCE'], name: '辰龙 (至尊金)' },
      { hex: ['#0F470F', '#1F8A1F', '#D6F5D6'], name: '巳蛇 (竹叶青)' },
      { hex: ['#8F1419', '#CD2026', '#FAD8D3'], name: '午马 (中国红)' },
      { hex: ['#A8A6AB', '#ECE9F2', '#FAFAFA'], name: '未羊 (珍珠白)' },
      { hex: ['#8A734D', '#C2A36E', '#F7EDDB'], name: '申猴 (香槟金)' },
      { hex: ['#A64B00', '#E66800', '#FFE9D6'], name: '酉鸡 (赤霞橘)' },
      { hex: ['#5E3D1D', '#8C5B2B', '#F5EBE0'], name: '戌狗 (陶土棕)' },
      { hex: ['#7A5E94', '#AD86D1', '#EFE5F7'], name: '亥猪 (丁香紫)' },
    ],
    name: 'zodiac_signs_12',
  },
  {
    colors: [
      { hex: ['#9E1A25', '#E32636', '#FCDAD7'], name: '白羊座 (明烈红)' },
      { hex: ['#165C16', '#228B22', '#D6ECD6'], name: '金牛座 (森林绿)' },
      { hex: ['#A6A000', '#FFF700', '#FFFCD0'], name: '双子座 (柠檬黄)' },
      { hex: ['#9E9EB8', '#E6E6FA', '#F2F2FA'], name: '巨蟹座 (月光银)' },
      { hex: ['#B39700', '#FFD700', '#FFF4CC'], name: '狮子座 (太阳金)' },
      { hex: ['#948F8A', '#D1CAC2', '#F7F5F2'], name: '处女座 (杏仁浅灰)' },
      { hex: ['#A87979', '#F4C2C2', '#FDEAEA'], name: '天秤座 (粉晶色)' },
      { hex: ['#0E0E12', '#1A1A24', '#E5E5E8'], name: '天蝎座 (冥夜黑)' },
      { hex: ['#132A45', '#1E3F66', '#D9E3F0'], name: '射手座 (星空蓝)' },
      { hex: ['#303133', '#48494B', '#ECECED'], name: '摩羯座 (玄武岩灰)' },
      { hex: ['#00A3A3', '#00FFFF', '#D6FFFF'], name: '水瓶座 (电光青)' },
      { hex: ['#1E3B63', '#2E5894', '#DBE3F0'], name: '双鱼座 (海之迷蓝)' },
    ],
    name: 'astrology_signs_12',
  },
  {
    colors: [
      { hex: ['#A1AAB3', '#F0F8FF', '#F4FAFF'], name: '一月 (冰雪白)' },
      { hex: ['#A3A321', '#FAFA33', '#FFFFD4'], name: '二月 (迎春黄)' },
      { hex: ['#A67780', '#FFB7C5', '#FFE3E7'], name: '三月 (桃花粉)' },
      { hex: ['#5FB35F', '#98FF98', '#E0FFE0'], name: '四月 (嫩芽绿)' },
      { hex: ['#5B8D9E', '#87CEEB', '#E0F2FA'], name: '五月 (浅蔚蓝)' },
      { hex: ['#1F5E3B', '#2E8B57', '#DBEFE4'], name: '六月 (西瓜翠)' },
      { hex: ['#A31C26', '#ED2939', '#FCDCDD'], name: '七月 (骄阳烈红)' },
      { hex: ['#A16F16', '#EAA221', '#FCEFCE'], name: '八月 (向日葵黄)' },
      { hex: ['#A37D1D', '#EDB62B', '#FCF3D7'], name: '九月 (桂花金)' },
      { hex: ['#8A3322', '#C84B31', '#F7DDD6'], name: '十月 (枫叶红)' },
      { hex: ['#422C16', '#654321', '#EDE4DB'], name: '十一月 (落叶褐)' },
      { hex: ['#14331D', '#1E4D2B', '#DCE6DD'], name: '十二月 (松柏绿)' },
    ],
    name: 'months_12',
  },
  {
    colors: [
      { hex: ['#525252', '#7A7A7A', '#EBEBEB'], name: '碳 (C - 石墨黑/暗灰)' },
      { hex: ['#9E885D', '#E6C687', '#FAF3E3'], name: '硫 (S - 硫磺淡黄)' },
      { hex: ['#8C7324', '#D4AF37', '#FAECD1'], name: '金 (Au - 赤金)' },
      { hex: ['#858585', '#C0C0C0', '#F2F2F2'], name: '银 (Ag - 亮银)' },
      { hex: ['#805024', '#B87333', '#F5E9DC'], name: '铜 (Cu - 紫铜/红铜)' },
      { hex: ['#6E6E59', '#A3A386', '#F2F2E1'], name: '氯 (Cl - 黄绿)' },
      { hex: ['#5C2218', '#8A3324', '#F4E3DD'], name: '溴 (Br - 深红褐液体)' },
      { hex: ['#320057', '#4B0082', '#EFE2F5'], name: '碘 (I - 紫黑固体/碘蒸气)' },
      { hex: ['#9E9E9E', '#E0E0E0', '#FAFAFA'], name: '铝 (Al - 银白轻金属)' },
      { hex: ['#808080', '#B7B7B7', '#EBEBEB'], name: '钛 (Ti - 暗银灰)' },
      { hex: ['#B33000', '#FF4500', '#FFDDD1'], name: '氖 (Ne - 霓虹橙红放电色)' },
      { hex: ['#3333B3', '#4D4DFF', '#E1E1FF'], name: '氩 (Ar - 薰衣草紫蓝放电色)' },
    ],
    name: 'chemical_elements_12',
  },
  {
    colors: [
      { hex: ['#6D7A85', '#A2B4C3', '#ECF1F5'], name: '锝 (Tc - 银灰放射性过渡金属)' },
      { hex: ['#00C2C9', '#7DF9FF', '#D6FFFF'], name: '钷 (Pm - 荧光青/盐类淡蓝荧光)' },
      { hex: ['#975B97', '#DDA0DD', '#F9ECF9'], name: '钋 (Po - 浅紫/空气电离蓝色辉光)' },
      { hex: ['#00B359', '#00FF7F', '#CEFFEC'], name: '氡 (Rn - 荧光绿/低温固体磷光)' },
      { hex: ['#9C815E', '#DEB887', '#F9F3EA'], name: '钫 (Fr - 浅棕/碱金属特征暗色)' },
      { hex: ['#00B3B3', '#00FFFF', '#D6FFFF'], name: '镭 (Ra - 纯白晶体/自发自生苍蓝荧光)' },
      { hex: ['#8F8F8F', '#CCCCCC', '#F2F2F2'], name: '锕 (Ac - 银白金属/暗处浅蓝辉光)' },
      { hex: ['#858585', '#C0C0C0', '#F2F2F2'], name: '钍 (Th - 亮银白金属)' },
      { hex: ['#A8A162', '#F0E68C', '#FDFCE6'], name: '镤 (Pa - 浅黄/空气氧化层色)' },
      { hex: ['#1F5E3B', '#2E8B57', '#DBEFE4'], name: '铀 (U - 经典铀酰离子墨绿/亮绿)' },
      { hex: ['#002BB3', '#0040FF', '#D6E0FF'], name: '镎 (Np - 三价镎离子深海蓝)' },
      { hex: ['#A15818', '#E67E22', '#FCECDD'], name: '钚 (Pu - 四价钚离子肉桂橙棕)' },
      { hex: ['#B37F87', '#FFB6C1', '#FFEBEF'], name: '镅 (Am - 三价镅离子浅玫瑰粉)' },
      { hex: ['#A6A8A9', '#F4F6F7', '#FAFBFB'], name: '锔 (Cm - 三价锔无色/金属银白)' },
      { hex: ['#A86C0C', '#F39C12', '#FEF2DC'], name: '锫 (Bk - 琥珀黄黄绿)' },
      { hex: ['#1F8F4F', '#2ECC71', '#DCF7E7'], name: '锎 (Cf - 翡翠绿)' },
      { hex: ['#A1352A', '#E74C3C', '#FCE3E0'], name: '锿 (Es - 三价锿晶体发光红)' },
      { hex: ['#6D3E80', '#9B59B6', '#F2E7F7'], name: '镄 (Fm - 薰衣草浅紫)' },
      { hex: ['#0F705D', '#16A085', '#DAF2EE'], name: '钔 (Md - 暗绿)' },
      { hex: ['#687373', '#95A5A6', '#EFEFEE'], name: '锘 (No - 浅灰金属)' },
      { hex: ['#943B00', '#D35400', '#FBE6D9'], name: '铹 (Lr - 橙红)' },
      { hex: ['#596263', '#7F8C8D', '#ECEEED'], name: '鑪 (Rf - 钢灰)' },
      { hex: ['#202D3A', '#34495E', '#DCDEC1'], name: '𨧀 (Db - 深蓝灰)' },
      { hex: ['#84898C', '#BDC3C7', '#F2F4F4'], name: '𨭎 (Sg - 银亮金属色)' },
      { hex: ['#A15818', '#E67E22', '#FCECDD'], name: '𨨏 (Bh - 亮橙)' },
      { hex: ['#1C2833', '#2C3E50', '#DCE1E5'], name: '𨭆 (Hs - 浓黑/易挥发氧化物)' },
      { hex: ['#63307A', '#8E44AD', '#F0E4F5'], name: '鿏 (Mt - 钴紫)' },
      { hex: ['#246A99', '#3498DB', '#DCEDF8'], name: '𨳼 (Ds - 浅天蓝)' },
      { hex: ['#12846D', '#1ABC9C', '#DAF4F0'], name: '𨾭 (Rg - 铋绿)' },
      { hex: ['#A8890A', '#F1C40F', '#FEF9DC'], name: '鿔 (Cn - 金黄)' },
      { hex: ['#8C7324', '#D4AF37', '#FAECD1'], name: '鿭 (Nh - 浅金)' },
      { hex: ['#31173B', '#4A235A', '#EFE6F2'], name: '鿫 (Og - 气态深紫电离色)' },
    ],
    name: 'radioactive_elements_32',
  },
  {
    colors: [
      { hex: ['#A62F2F', '#EF4444', '#FCEAEA'], name: 'Red' },
      { hex: ['#AD5010', '#F97316', '#FDF1E8'], name: 'Orange' },
      { hex: ['#AB6E08', '#F59E0B', '#FDF5E7'], name: 'Amber' },
      { hex: ['#A37D06', '#EAB308', '#FDF8E6'], name: 'Yellow' },
      { hex: ['#5C8E10', '#84CC16', '#F3FCE8'], name: 'Lime' },
      { hex: ['#188A42', '#22C55E', '#EAFCEF'], name: 'Green' },
      { hex: ['#0B825B', '#10B981', '#E7FAF2'], name: 'Emerald' },
      { hex: ['#0E8073', '#14B8A6', '#E7FAF6'], name: 'Teal' },
      { hex: ['#047F94', '#06B6D4', '#E6FAFD'], name: 'Cyan' },
      { hex: ['#0A73A3', '#0EA5E9', '#E7FAFF'], name: 'Sky' },
      { hex: ['#295BAC', '#3B82F6', '#EBF3FE'], name: 'Blue' },
      { hex: ['#4547A8', '#6366F1', '#EFF0FE'], name: 'Indigo' },
      { hex: ['#6141AC', '#8B5CF6', '#F4EFFF'], name: 'Violet' },
      { hex: ['#753CAC', '#A855F7', '#F6EFFF'], name: 'Purple' },
      { hex: ['#9731A6', '#D946EF', '#FBEBFD'], name: 'Fuchsia' },
      { hex: ['#A5326B', '#EC4899', '#FCEBF5'], name: 'Pink' },
      { hex: ['#AA2C42', '#F43F5E', '#FCEBEF'], name: 'Rose' },
      { hex: ['#465161', '#64748B', '#EFF1F4'], name: 'Slate' },
      { hex: ['#4B505A', '#6B7280', '#F0F1F3'], name: 'Gray' },
      { hex: ['#4F4F56', '#71717A', '#F1F1F2'], name: 'Zinc' },
      { hex: ['#505050', '#737373', '#F1F1F1'], name: 'Neutral' },
      { hex: ['#544F4C', '#78716C', '#F2F1F0'], name: 'Stone' },
      { hex: ['#574C48', '#7C6D67', '#F2EFEB'], name: 'Taupe' },
      { hex: ['#544956', '#79697B', '#F2EFF3'], name: 'Mauve' },
      { hex: ['#485457', '#67787C', '#EFF3F4'], name: 'Mist' },
      { hex: ['#575748', '#7C7C67', '#F2F2EF'], name: 'Olive' },
    ],
    name: 'tailwind',
  },
]

export default function SettingsPage() {
  const { t, i18n } = useTranslation('common')
  const {
    theme,
    themeColor,
    language,
    priorityMode,
    notificationEnabled,
    fontSize,
    sidebarMode,
    weekStartDay,
    showLunar,
    showTimezone,
    selectedTimezone,
    timeFormat,
    dateFormat,
    timezoneFormat,
    defaultTaskOpenView,
    todayResetHour,
    setTheme,
    setThemeColor,
    setLanguage,
    setPriorityMode,
    setNotificationEnabled,
    setFontSize,
    setSidebarMode,
    setWeekStartDay,
    setShowLunar,
    setShowTimezone,
    setSelectedTimezone,
    setTimeFormat,
    setDateFormat,
    setTimezoneFormat,
    setDefaultTaskSections,
    setDefaultTaskOpenView,
    setTodayResetHour,
  } = useAppStore()
  const defaultTaskSections = useAppStore(
    (s) => s.defaultTaskSections,
    (a, b) =>
      a.steps === b.steps &&
      a.subtasks === b.subtasks &&
      a.attachments === b.attachments &&
      a.notes === b.notes &&
      a.persons === b.persons &&
      a.media === b.media,
  )

  useEffect(() => {
    emit('settings:changed', { key: 'theme', value: theme })
  }, [theme])
  useEffect(() => {
    emit('settings:changed', { key: 'themeColor', value: themeColor })
  }, [themeColor])
  useEffect(() => {
    emit('settings:changed', { key: 'fontSize', value: fontSize })
  }, [fontSize])
  useEffect(() => {
    emit('settings:changed', { key: 'priorityMode', value: priorityMode })
  }, [priorityMode])
  useEffect(() => {
    emit('settings:changed', { key: 'language', value: language })
  }, [language])
  useEffect(() => {
    emit('settings:changed', { key: 'weekStartDay', value: weekStartDay })
  }, [weekStartDay])
  useEffect(() => {
    emit('settings:changed', { key: 'showLunar', value: showLunar })
  }, [showLunar])
  useEffect(() => {
    emit('settings:changed', { key: 'showTimezone', value: showTimezone })
  }, [showTimezone])
  useEffect(() => {
    emit('settings:changed', { key: 'selectedTimezone', value: selectedTimezone })
  }, [selectedTimezone])
  useEffect(() => {
    emit('settings:changed', { key: 'timeFormat', value: timeFormat })
  }, [timeFormat])
  useEffect(() => {
    emit('settings:changed', { key: 'dateFormat', value: dateFormat })
  }, [dateFormat])
  useEffect(() => {
    emit('settings:changed', { key: 'timezoneFormat', value: timezoneFormat })
  }, [timezoneFormat])
  const prevSectionsRef = useRef(defaultTaskSections)
  useEffect(() => {
    const prev = prevSectionsRef.current
    const curr = defaultTaskSections
    if (
      prev.steps !== curr.steps ||
      prev.subtasks !== curr.subtasks ||
      prev.attachments !== curr.attachments ||
      prev.notes !== curr.notes ||
      prev.persons !== curr.persons ||
      prev.media !== curr.media
    ) {
      prevSectionsRef.current = curr
      emit('settings:changed', { key: 'defaultTaskSections', value: curr })
    }
  }, [defaultTaskSections])
  useEffect(() => {
    emit('settings:changed', { key: 'defaultTaskOpenView', value: defaultTaskOpenView })
  }, [defaultTaskOpenView])

  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'datetime' | 'sync' | 'shortcuts' | 'tasks'>(
    'general',
  )
  const [permStatus, setPermStatus] = useState<string | null>(null)

  const { data: calendarEvents = [] } = useCalendarEvents()
  const importMutation = useImportCalendarEvents()
  const clearMutation = useClearAllCalendarEvents()
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timezoneButtonRef = useRef<HTMLButtonElement>(null)

  // Sync state
  const [syncProvider, setSyncProvider] = useState<'github' | 'gitlab' | 'gitee'>(
    () => (localStorage.getItem('mindless-sync-provider') as 'github' | 'gitlab' | 'gitee') || 'github',
  )
  const [syncUrls, setSyncUrls] = useState<Record<string, string>>(() => ({
    gitee: localStorage.getItem('mindless-sync-url-gitee') || '',
    github: localStorage.getItem('mindless-sync-url-github') || '',
    gitlab: localStorage.getItem('mindless-sync-url-gitlab') || '',
  }))
  const [syncPats, setSyncPats] = useState<Record<string, string>>({ gitee: '', github: '', gitlab: '' })
  const [syncHasPat, setSyncHasPat] = useState<Record<string, boolean>>({
    gitee: !!localStorage.getItem('mindless-sync-has-pat-gitee.com'),
    github: !!localStorage.getItem('mindless-sync-has-pat-github.com'),
    gitlab: !!localStorage.getItem('mindless-sync-has-pat-gitlab.com'),
  })
  const [gitlabProjectId, setGitlabProjectId] = useState(
    () => localStorage.getItem('mindless-sync-gitlab-project-id') || '',
  )
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncAction, setSyncAction] = useState<'test' | 'sync' | null>(null)

  const syncUrl = syncUrls[syncProvider] || ''
  const syncPat = syncPats[syncProvider] || ''

  const setSyncUrl = (url: string) => {
    setSyncUrls((prev) => ({ ...prev, [syncProvider]: url }))
    localStorage.setItem(`mindless-sync-url-${syncProvider}`, url)
  }

  const setSyncPat = (pat: string) => {
    setSyncPats((prev) => ({ ...prev, [syncProvider]: pat }))
  }

  const domainMap: Record<string, string> = {
    gitee: 'gitee.com',
    github: 'github.com',
    gitlab: 'gitlab.com',
  }

  useEffect(() => {
    localStorage.setItem('mindless-sync-provider', syncProvider)
  }, [syncProvider])

  const loadPatIfNeeded = async (domain: string): Promise<string> => {
    const existing = syncPats[Object.keys(domainMap).find((k) => domainMap[k] === domain) || '']
    if (existing) return existing
    const { loadPat } = await import('@/lib/api')
    const pat = await loadPat(domain)
    if (pat) {
      const key = Object.keys(domainMap).find((k) => domainMap[k] === domain) || ''
      setSyncPats((prev) => ({ ...prev, [key]: pat }))
    }
    return pat || ''
  }

  const handleSavePat = async () => {
    if (!syncUrl || !syncPat) return
    try {
      const { savePat } = await import('@/lib/api')
      await savePat(domainMap[syncProvider], syncPat)
      localStorage.setItem(`mindless-sync-has-pat-${domainMap[syncProvider]}`, '1')
      setSyncHasPat((prev) => ({ ...prev, [syncProvider]: true }))
    } catch {}
  }

  const handleTest = async () => {
    let pat = syncPat
    if (!pat && syncHasPat[syncProvider]) {
      pat = await loadPatIfNeeded(domainMap[syncProvider])
    }
    if (!syncUrl || !pat) {
      setSyncStatus('empty_fields')
      return
    }
    setSyncLoading(true)
    setSyncAction('test')
    setSyncStatus(null)
    setSyncError(null)
    try {
      const { testConnection } = await import('@/lib/sync')
      const result = await testConnection(pat, syncUrl, syncProvider === 'gitlab' ? gitlabProjectId : undefined)
      if (result.success) {
        setSyncStatus('test_success')
        setSyncError(null)
      } else {
        setSyncStatus('test_failed')
        setSyncError(result.error || 'unknown_error')
      }
    } catch (err: any) {
      setSyncStatus('test_failed')
      setSyncError(err.message || 'unknown_error')
    } finally {
      setSyncLoading(false)
      setSyncAction(null)
    }
  }

  const handleSync = async () => {
    let pat = syncPat
    if (!pat && syncHasPat[syncProvider]) {
      pat = await loadPatIfNeeded(domainMap[syncProvider])
    }
    if (!syncUrl || !pat) {
      setSyncStatus('empty_fields')
      return
    }
    setSyncLoading(true)
    setSyncAction('sync')
    setSyncStatus(null)
    try {
      const { exportAllData, getDbBase64 } = await import('@/lib/api')
      const { syncToRepo } = await import('@/lib/sync')
      const [exportJson, dbBase64] = await Promise.all([exportAllData(), getDbBase64()])
      const result = await syncToRepo(
        pat,
        syncUrl,
        exportJson,
        dbBase64,
        syncProvider === 'gitlab' ? gitlabProjectId : undefined,
      )
      setSyncStatus(result.success ? 'sync_success' : 'sync_failed')
    } catch {
      setSyncStatus('sync_failed')
    } finally {
      setSyncLoading(false)
      setSyncAction(null)
    }
  }

  useEffect(() => {
    const unlisten = listen<{ timezone?: string }>('timezone-picker-overlay:result', (e) => {
      if (e.payload.timezone !== undefined) {
        setSelectedTimezone(e.payload.timezone)
      }
    })
    return () => {
      unlisten.then((fn) => fn()).catch(() => {})
    }
  }, [setSelectedTimezone])

  const handleOpenTimezonePicker = async () => {
    const button = timezoneButtonRef.current
    if (!button) return
    const rect = await getScreenRect(button)
    await showOverlay(TIMEZONE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      timezone: selectedTimezone,
    })
  }

  const eventCount = calendarEvents.length

  function parseICS(content: string): { title: string; eventDate: string; eventType: string }[] {
    const events: { title: string; eventDate: string; eventType: string }[] = []
    const blocks = content.split('BEGIN:VEVENT')
    for (const block of blocks.slice(1)) {
      const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r?\n)/)
      const dtStartMatch = block.match(/DTSTART(?:;[^:]*)?:(.*?)(?:\r?\n)/)
      if (summaryMatch && dtStartMatch) {
        const title = summaryMatch[1].trim()
        const dtRaw = dtStartMatch[1].trim()
        let dateStr = ''
        if (dtRaw.length >= 8) {
          dateStr = `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)}`
        }
        if (dateStr) {
          events.push({ eventDate: dateStr, eventType: 'holiday', title })
        }
      }
    }
    return events
  }

  const handleImportICS = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatus(null)
    try {
      const text = await file.text()
      const events = parseICS(text)
      if (events.length === 0) {
        setImportStatus(t('settings.calendar.import_empty'))
      } else {
        const count = await importMutation.mutateAsync({ events, source: file.name })
        setImportStatus(t('settings.calendar.import_success', { count }))
      }
    } catch (err) {
      setImportStatus(String(err))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClearEvents = () => {
    clearMutation.mutate()
    setImportStatus(null)
  }

  const handleToggleNotification = async (enabled: boolean) => {
    if (enabled) {
      const granted = await isPermissionGranted()
      if (!granted) {
        const result = await requestPermission()
        if (result !== 'granted') {
          setPermStatus(t('settings.notifications.denied'))
          return
        }
      }
      setPermStatus(t('settings.notifications.granted'))
    } else {
      setPermStatus(null)
    }
    setNotificationEnabled(enabled)
  }

  const handleTestNotification = () => {
    sendNotification({
      body: t('settings.notifications.test_body'),
      title: t('settings.notifications.test_title'),
    })
  }

  const handleCheckNow = () => {
    checkAndNotify()
      .then(() => {
        setPermStatus(t('settings.notifications.checked'))
      })
      .catch((err) => {
        setPermStatus(String(err))
      })
  }

  const tabs = [
    { icon: Settings, id: 'general' as const, label: t('settings.tabs.general') },
    { icon: ListTodo, id: 'tasks' as const, label: t('settings.tabs.tasks') },
    { icon: Clock, id: 'datetime' as const, label: t('settings.tabs.datetime') },
    { icon: Palette, id: 'theme' as const, label: t('settings.tabs.theme') },
    { icon: Cloud, id: 'sync' as const, label: t('settings.tabs.sync') },
    { icon: Command, id: 'shortcuts' as const, label: t('settings.tabs.shortcuts') },
  ]

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        data-tauri-drag-region
        className="w-37.5 shrink-0 border-r border-white/10 flex flex-col gap-1 bg-theme-sidebar dark:bg-theme-sidebar-dark"
        // style={{
        //   background:
        //     'linear-gradient(to bottom, color-mix(in srgb, var(--theme-color) 30%, white), color-mix(in srgb, var(--theme-color) 20%, white)',
        // }}
      >
        <div data-tauri-drag-region className="p-3 flex items-center gap-1.5 h-8">
          <button
            type="button"
            onClick={async () => {
              await getCurrentWindow().close()
            }}
            className="w-3 h-3 rounded-full bg-[#898989] hover:bg-[#FF3B30] transition-colors group relative"
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-2.5 h-2.5 m-auto opacity-0 group-hover:opacity-100"
            >
              <title>cross close</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              type="button"
              key={tab.id}
              // style={{
              //   color: `hsl(from var(--theme-color) h s calc(l - 20))`,
              // }}
              onClick={() => setActiveTab(tab.id)}
              className={`text-sm flex flex-row items-center gap-1.5 ps-4 px-2.5 py-3 transition-all cursor-pointer ${
                isActive
                  ? 'text-theme-50 dark:text-theme-200 bg-theme-200/50 dark:bg-theme-200/50'
                  : 'hover:text-theme-100 hover:bg-theme-200/40 text-theme-700 dark:text-theme-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl">
            {/* Language */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.language')}</h2>
              <div className="flex gap-2">
                {[
                  { label: '中', value: 'zh' },
                  { label: 'En', value: 'en' },
                  { label: '日', value: 'ja' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-center w-14 h-10 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                      language === option.value
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={option.value}
                      checked={language === option.value}
                      onChange={() => {
                        const lang = option.value as 'zh' | 'en' | 'ja'
                        setLanguage(lang)
                        i18n.changeLanguage(lang)
                      }}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>

            {/* Appearance (light/dark/system) */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.theme')}</h2>
              <div className="flex gap-2">
                {[
                  { icon: Sun, label: t('settings.theme.light'), value: 'light' },
                  { icon: Moon, label: t('settings.theme.dark'), value: 'dark' },
                  { icon: Laptop, label: t('settings.theme.system'), value: 'system' },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className={`flex flex-col items-center justify-center gap-1.5 w-20 h-16 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        theme === option.value
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={theme === option.value}
                        onChange={() => setTheme(option.value as Theme)}
                        className="sr-only"
                      />
                      <Icon className="w-5 h-5" />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Font size */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.font_size')}</h2>
              <div className="flex gap-2">
                {[
                  { iconSize: 'w-4 h-4', label: '14px', value: 'small' },
                  { iconSize: 'w-5 h-5', label: '16px', value: 'default' },
                  { iconSize: 'w-6 h-6', label: '18px', value: 'large' },
                  { iconSize: 'w-7 h-7', label: '20px', value: 'xlarge' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      fontSize === option.value
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fontSize"
                      value={option.value}
                      checked={fontSize === option.value}
                      onChange={() => setFontSize(option.value as FontSize)}
                      className="sr-only"
                    />
                    <Type className={option.iconSize} />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>

            {/* Sidebar display mode */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.sidebar_mode')}
              </h2>
              <div className="flex gap-2">
                {[
                  { icon: LayoutGrid, label: t('settings.sidebar_mode.icon'), value: 'icon' },
                  { icon: Type, label: t('settings.sidebar_mode.text'), value: 'text' },
                  { icon: Layers, label: t('settings.sidebar_mode.both'), value: 'both' },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className={`flex flex-col items-center justify-center gap-1.5 w-20 h-16 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        sidebarMode === option.value
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sidebarMode"
                        value={option.value}
                        checked={sidebarMode === option.value}
                        onChange={() => setSidebarMode(option.value as SidebarMode)}
                        className="sr-only"
                      />
                      <Icon className="w-5 h-5" />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.notifications.title')}
              </h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">
                      {t('settings.notifications.enable')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('settings.notifications.enable_desc')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onMouseDown={() => handleToggleNotification(!notificationEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notificationEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        notificationEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>

                {notificationEnabled && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {t('settings.notifications.test')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckNow}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('settings.notifications.check_now')}
                    </button>
                  </div>
                )}

                {permStatus && <p className="text-sm text-gray-500 dark:text-gray-400 italic">{permStatus}</p>}
              </div>
            </section>

            {/* Calendar */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.calendar.title')}
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('settings.calendar.ics_desc')}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleImportICS}
                      disabled={importing}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      {importing ? t('common.loading') : t('settings.calendar.import_ics')}
                    </button>
                    {eventCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearEvents}
                        className="px-4 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        {t('settings.calendar.clear_events')} ({eventCount})
                      </button>
                    )}
                  </div>
                  {importStatus && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{importStatus}</p>}
                </div>
              </div>
            </section>

            {/* About */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.about')}</h2>
              <div className="text-gray-600 dark:text-gray-400">
                <p className="mb-2">
                  <strong>Mindless</strong> - {t('app.name')}
                </p>
                <p className="text-sm">{t('settings.version')}: 1.0.0</p>
              </div>
            </section>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6 max-w-2xl">
            {/* Default visible sections */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.tasks.default_sections')}
              </h2>
              <div className="relative flex items-center gap-1">
                {[
                  { icon: List, key: 'steps', label: t('tasks.steps.title') },
                  { icon: Table2, key: 'subtasks', label: t('tasks.subtasks.title') },
                  { icon: Paperclip, key: 'attachments', label: t('tasks.attachments') },
                  { icon: File, key: 'notes', label: t('media.linkedNotes') },
                  { icon: Contact, key: 'persons', label: t('notes.linked_persons') },
                  { icon: Film, key: 'media', label: t('notes.linked_media') },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    className={`relative group p-2 rounded-lg transition-colors ${
                      defaultTaskSections[key as keyof DefaultTaskSections]
                        ? 'bg-theme-100 dark:bg-theme-800 text-theme-600 dark:text-theme-100'
                        : 'text-theme-700 dark:text-theme-500 hover:bg-theme-100 dark:hover:bg-theme-700'
                    }`}
                    key={key}
                    onClick={() =>
                      setDefaultTaskSections({
                        ...defaultTaskSections,
                        [key]: !defaultTaskSections[key as keyof DefaultTaskSections],
                      })
                    }
                    type="button"
                  >
                    <Icon className="w-5 h-5" style={{ strokeWidth: '1.5px' }} />
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-theme-900 dark:bg-theme-100 text-white dark:text-theme-900 text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Default open view */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.tasks.default_open')}
              </h2>
              <div className="space-y-2">
                {(
                  [
                    { label: t('settings.tasks.default_open.last'), value: 'last' },
                    { label: t('settings.tasks.default_open.today'), value: 'today' },
                    { label: t('settings.tasks.default_open.inbox'), value: 'inbox' },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="radio"
                      name="defaultTaskOpenView"
                      value={option.value}
                      checked={defaultTaskOpenView === option.value}
                      onChange={() => setDefaultTaskOpenView(option.value)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{option.label}</div>
                  </label>
                ))}
              </div>
            </section>

            {/* Priority mode */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.priority_mode')}
              </h2>
              <div className="space-y-2">
                {[
                  {
                    description: t('settings.priority_mode.simple_desc'),
                    label: t('settings.priority_mode.simple'),
                    value: 'Traditional',
                  },
                  {
                    description: t('settings.priority_mode.detailed_desc'),
                    label: t('settings.priority_mode.detailed'),
                    value: 'OxygenNotIncluded',
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="radio"
                      name="priorityMode"
                      value={option.value}
                      checked={priorityMode === option.value}
                      onChange={() => setPriorityMode(option.value as PriorityMode)}
                      className="w-4 h-4 text-blue-500 mt-1"
                    />
                    <div>
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Today reset hour */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.tasks.today_reset')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings.tasks.today_reset_desc')}</p>
              <div className="grid grid-cols-4 gap-2">
                {([0, 6, 12, 18] as const).map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setTodayResetHour(hour)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      todayResetHour === hour
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Date & Time Tab */}
        {activeTab === 'datetime' && (
          <div className="space-y-6 max-w-2xl">
            {/* Week Start Day */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.datetime.week_start_day')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('settings.datetime.week_start_day_desc')}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'sunday', value: 0 },
                  { key: 'monday', value: 1 },
                  { key: 'tuesday', value: 2 },
                  { key: 'wednesday', value: 3 },
                  { key: 'thursday', value: 4 },
                  { key: 'friday', value: 5 },
                  { key: 'saturday', value: 6 },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      weekStartDay === option.value
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="weekStartDay"
                      value={option.value}
                      checked={weekStartDay === option.value}
                      onChange={() => setWeekStartDay(option.value)}
                      className="sr-only"
                    />
                    {t(`settings.datetime.days.${option.key}`)}
                  </label>
                ))}
              </div>
            </section>

            {/* Time Format */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.datetime.time_format')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings.datetime.time_format_desc')}</p>
              <div className="space-y-2">
                {(['cn_natural', 'cn_24h', 'cn_12h', 'en_12h', '24h'] as TimeFormat[]).map((fmt) => (
                  <label
                    key={fmt}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="radio"
                      name="timeFormat"
                      checked={timeFormat === fmt}
                      onChange={() => setTimeFormat(fmt)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-gray-900 dark:text-gray-100">
                      {t(`settings.datetime.time_formats.${fmt}`)}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">{formatTime('15:12', fmt)}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Date Format */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.datetime.date_format')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings.datetime.date_format_desc')}</p>
              <div className="space-y-2">
                {(['relative', 'yyyy_slash_mm_dd', 'yyyy_dash_mm_dd', 'mm_dd_yyyy', 'mm_dd'] as DateFormat[]).map(
                  (fmt) => (
                    <label
                      key={fmt}
                      className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <input
                        type="radio"
                        name="dateFormat"
                        checked={dateFormat === fmt}
                        onChange={() => setDateFormat(fmt)}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-gray-900 dark:text-gray-100">
                        {t(`settings.datetime.date_formats.${fmt}`)}
                      </span>
                      <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">
                        {formatDisplayDate('2025-03-24', fmt, t)}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </section>

            {/* Timezone Format */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.datetime.timezone_format')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('settings.datetime.timezone_format_desc')}
              </p>
              <div className="space-y-2">
                {(
                  ['short_offset', 'iana', 'compact', 'gmt', 'utc_colon', 'iso_colon', 'cn_zone'] as TimezoneFormat[]
                ).map((fmt) => (
                  <label
                    key={fmt}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="radio"
                      name="timezoneFormat"
                      checked={timezoneFormat === fmt}
                      onChange={() => setTimezoneFormat(fmt)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-gray-900 dark:text-gray-100">
                      {t(`settings.datetime.timezone_formats.${fmt}`)}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">
                      {formatTimezoneOffset(selectedTimezone, fmt)}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Show Lunar */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-gray-900 dark:text-gray-100 font-medium">
                    {t('settings.datetime.show_lunar')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.datetime.show_lunar_desc')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLunar(!showLunar)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    showLunar ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      showLunar ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </section>

            {/* Show Timezone */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <div>
                  <div className="text-gray-900 dark:text-gray-100 font-medium">
                    {t('settings.datetime.show_timezone')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.datetime.show_timezone_desc')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTimezone(!showTimezone)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    showTimezone ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      showTimezone ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
              {showTimezone && (
                <div>
                  <div className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.datetime.timezone_picker')}
                  </div>
                  <button
                    ref={timezoneButtonRef}
                    type="button"
                    onClick={handleOpenTimezonePicker}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    <span className="truncate">{selectedTimezone.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {formatTimezoneOffset(selectedTimezone, timezoneFormat)}
                    </span>
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Theme Tab */}
        {activeTab === 'theme' && (
          <div className="space-y-6 max-w-2xl">
            <section className="bg-white dark:bg-gray-800 p-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('settings.theme_color.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('settings.theme_color.description')}</p>
              <div className="palettes gap-3 flex flex-col">
                {THEME_PALETTES2.map((palette) => {
                  return (
                    <div className="p-3" key={palette.name}>
                      <h3 className="py-3 text-md">
                        {t(getThemePaletteLabelKey(palette.name), { defaultValue: palette.name })}
                      </h3>
                      <div className="grid grid-cols-9 gap-4">
                        {palette.colors.map((color) => {
                          const isSelected = color.hex.includes(themeColor)
                          return (
                            <button type="button" className="flex flex-col items-center gap-2 group" key={color.name}>
                              <div className="flex flex-row ">
                                {color.hex.map((color_i) => {
                                  const isSelectedSub = themeColor === color_i
                                  return (
                                    <div
                                      key={color_i}
                                      onMouseUp={() => setThemeColor(color_i)}
                                      className={`w-4 h-7 transition-all ${
                                        isSelectedSub ? `inset-ring-1 scale-120` : 'hover:scale-105'
                                      }`}
                                      style={
                                        {
                                          '--tw-ring-color': isSelected ? color_i : undefined,
                                          backgroundColor: color_i,
                                        } as React.CSSProperties
                                      }
                                    />
                                  )
                                })}
                              </div>
                              <span
                                className={`text-xs transition-colors ${
                                  isSelected
                                    ? 'text-gray-900 dark:text-gray-100 font-medium'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                              >
                                {t(getThemeColorLabelKey(color.name, palette.name), {
                                  defaultValue: formatThemeColorName(
                                    color.name,
                                    palette.name,
                                    i18n.resolvedLanguage ?? i18n.language,
                                  ),
                                })}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6 max-w-2xl">
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex gap-2 mb-6">
                  {[
                    { label: t('settings.sync.provider_github'), value: 'github' },
                    { label: t('settings.sync.provider_gitlab'), value: 'gitlab' },
                    { label: t('settings.sync.provider_gitee'), value: 'gitee' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                        syncProvider === option.value
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncProvider"
                        value={option.value}
                        checked={syncProvider === option.value}
                        onChange={() => setSyncProvider(option.value as 'github' | 'gitlab' | 'gitee')}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {t('settings.sync.repo_url')}
                </h3>
                <input
                  type="text"
                  value={syncUrl}
                  onChange={(e) => setSyncUrl(e.target.value)}
                  placeholder={t(
                    `settings.sync.repo_url_placeholder${syncProvider !== 'github' ? `_${syncProvider}` : ''}`,
                  )}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />

                {syncProvider === 'gitlab' && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-4">
                      {t('settings.sync.gitlab_project_id')}
                    </h3>
                    <input
                      type="text"
                      value={gitlabProjectId}
                      onChange={(e) => {
                        setGitlabProjectId(e.target.value)
                        localStorage.setItem('mindless-sync-gitlab-project-id', e.target.value)
                      }}
                      placeholder={t('settings.sync.gitlab_project_id_placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {t('settings.sync.gitlab_project_id_help')}
                    </p>
                  </>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-4">
                  {t('settings.sync.pat')}
                </h3>
                <input
                  type="password"
                  value={syncPat}
                  onChange={(e) => setSyncPat(e.target.value)}
                  onBlur={handleSavePat}
                  onFocus={async () => {
                    if (!syncPat && syncHasPat[syncProvider]) {
                      await loadPatIfNeeded(domainMap[syncProvider])
                    }
                  }}
                  placeholder={syncHasPat[syncProvider] && !syncPat ? '••••••••' : t('settings.sync.pat_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('settings.sync.pat_help')}</p>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={syncLoading}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                  >
                    {syncLoading && syncAction === 'test' ? t('settings.sync.testing') : t('settings.sync.test')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncLoading}
                    className="px-4 py-2 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                    style={{ backgroundColor: 'var(--theme-color)' }}
                  >
                    {syncLoading && syncAction === 'sync' ? t('settings.sync.syncing') : t('settings.sync.sync_now')}
                  </button>
                </div>

                {syncStatus && (
                  <div className="mt-4">
                    <p
                      className={`text-sm ${
                        syncStatus === 'test_success' || syncStatus === 'sync_success'
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {t(`settings.sync.${syncStatus}`)}
                    </p>
                    {syncError && <p className="mt-2 text-xs text-red-400 dark:text-red-500 break-all">{syncError}</p>}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* Shortcuts Tab */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-6 max-w-2xl">
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                {t('settings.shortcuts.title')}
              </h2>

              <div className="space-y-6">
                {/* Navigation */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {t('settings.shortcuts.navigation')}
                  </h3>
                  <div className="space-y-2">
                    {[
                      { desc: t('settings.shortcuts.open_settings'), keys: ['⌘', ','] },
                      { desc: t('settings.shortcuts.open_tasks'), keys: ['⌘', 'T'] },
                      { desc: t('settings.shortcuts.open_habits'), keys: ['⌘', 'H'] },
                      { desc: t('settings.shortcuts.open_countdowns'), keys: ['⌘', 'D'] },
                      { desc: t('settings.shortcuts.open_tags'), keys: ['⌘', 'B'] },
                      { desc: t('settings.shortcuts.open_media'), keys: ['⌘', 'Y'] },
                      { desc: t('settings.shortcuts.open_people'), keys: ['⌘', 'P'] },
                    ].map((item) => (
                      <div
                        key={item.desc}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.desc}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {t('settings.shortcuts.actions')}
                  </h3>
                  <div className="space-y-2">
                    {[
                      { desc: t('settings.shortcuts.new_task'), keys: ['⌘', 'N'] },
                      { desc: t('settings.shortcuts.global_search'), keys: ['⌘', 'F'] },
                      { desc: t('settings.shortcuts.close_panel'), keys: ['Esc'] },
                    ].map((item) => (
                      <div
                        key={item.desc}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.desc}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Views */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {t('settings.shortcuts.views')}
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                      ({t('settings.shortcuts.tasks_page_only')})
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {[
                      { desc: t('settings.shortcuts.view_list'), keys: ['1'] },
                      { desc: t('settings.shortcuts.view_calendar'), keys: ['2'] },
                      { desc: t('settings.shortcuts.view_kanban'), keys: ['3'] },
                      { desc: t('settings.shortcuts.view_matrix'), keys: ['4'] },
                    ].map((item) => (
                      <div
                        key={item.desc}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.desc}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
