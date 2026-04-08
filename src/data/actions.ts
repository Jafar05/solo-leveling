import { StatKey, Difficulty } from '../engine/types';

export interface ActionPreset {
  id: string;
  label: string;
  stat: StatKey;
  durationMinutes: number;
  difficulty: Difficulty;
  emoji: string;
}

export const ACTION_PRESETS: ActionPreset[] = [
  // STR
  { id: 'warmup', label: 'Разминка', stat: 'str', durationMinutes: 10, difficulty: 'easy', emoji: '🤸' },
  { id: 'gym_30', label: 'Тренировка 30 мин', stat: 'str', durationMinutes: 30, difficulty: 'normal', emoji: '⚔️' },
  { id: 'gym_60', label: 'Тренировка 1 час', stat: 'str', durationMinutes: 60, difficulty: 'normal', emoji: '⚔️' },
  { id: 'gym_heavy', label: 'Тяжёлая тренировка', stat: 'str', durationMinutes: 90, difficulty: 'hard', emoji: '💪' },
  { id: 'run_5', label: 'Пробежка 5 км', stat: 'str', durationMinutes: 30, difficulty: 'normal', emoji: '🏃' },
  { id: 'run_10', label: 'Пробежка 10 км', stat: 'str', durationMinutes: 60, difficulty: 'hard', emoji: '🏃' },
  { id: 'marathon', label: 'Марафон', stat: 'str', durationMinutes: 240, difficulty: 'hard', emoji: '🏅' },

  // INT
  { id: 'read_20', label: 'Чтение 20 страниц', stat: 'int', durationMinutes: 25, difficulty: 'normal', emoji: '📚' },
  { id: 'read_60', label: 'Чтение 1 час', stat: 'int', durationMinutes: 60, difficulty: 'normal', emoji: '📚' },
  { id: 'book_done', label: 'Дочитал книгу', stat: 'int', durationMinutes: 120, difficulty: 'hard', emoji: '📖' },
  { id: 'course_60', label: 'Онлайн-курс 1 час', stat: 'int', durationMinutes: 60, difficulty: 'normal', emoji: '🎓' },
  { id: 'code_2h', label: 'Написал код 2 часа', stat: 'int', durationMinutes: 120, difficulty: 'normal', emoji: '💻' },
  { id: 'solve_problem', label: 'Решил сложную задачу', stat: 'int', durationMinutes: 45, difficulty: 'hard', emoji: '🧠' },

  // CHA
  { id: 'compliment', label: 'Комплимент незнакомцу', stat: 'cha', durationMinutes: 2, difficulty: 'normal', emoji: '😊' },
  { id: 'new_talk', label: 'Разговор с незнакомцем', stat: 'cha', durationMinutes: 10, difficulty: 'normal', emoji: '💬' },
  { id: 'networking', label: 'Нетворкинг событие', stat: 'cha', durationMinutes: 120, difficulty: 'hard', emoji: '🤝' },
  { id: 'speech_5', label: 'Речь перед 5+ людьми', stat: 'cha', durationMinutes: 20, difficulty: 'hard', emoji: '🎤' },
  { id: 'speech_50', label: 'Речь перед 50+ людьми', stat: 'cha', durationMinutes: 40, difficulty: 'hard', emoji: '🎤' },

  // SOC
  { id: 'msg_girl', label: 'Написал девушке первым', stat: 'soc', durationMinutes: 5, difficulty: 'normal', emoji: '💌' },
  { id: 'approach', label: 'Подошёл и заговорил', stat: 'soc', durationMinutes: 10, difficulty: 'hard', emoji: '🔥' },
  { id: 'got_number', label: 'Взял номер телефона', stat: 'soc', durationMinutes: 15, difficulty: 'hard', emoji: '📱' },
  { id: 'date_invite', label: 'Пригласил на свидание', stat: 'soc', durationMinutes: 10, difficulty: 'hard', emoji: '🌹' },
  { id: 'date_happened', label: 'Свидание состоялось', stat: 'soc', durationMinutes: 120, difficulty: 'hard', emoji: '❤️' },
  { id: 'rejected_anyway', label: 'Отказ — но не испугался', stat: 'soc', durationMinutes: 5, difficulty: 'hard', emoji: '🛡️' },

  // BIZ
  { id: 'work_focused', label: 'Фокусная работа 1 час', stat: 'biz', durationMinutes: 60, difficulty: 'normal', emoji: '💼' },
  { id: 'task_done', label: 'Закрыл сложную задачу', stat: 'biz', durationMinutes: 90, difficulty: 'hard', emoji: '✅' },
  { id: 'cold_call', label: 'Холодный звонок', stat: 'biz', durationMinutes: 15, difficulty: 'hard', emoji: '📞' },
  { id: 'negotiation', label: 'Переговоры', stat: 'biz', durationMinutes: 60, difficulty: 'hard', emoji: '🤝' },
  { id: 'deal_closed', label: 'Закрыл сделку', stat: 'biz', durationMinutes: 30, difficulty: 'hard', emoji: '💰' },
  { id: 'product_launch', label: 'Запустил продукт', stat: 'biz', durationMinutes: 480, difficulty: 'hard', emoji: '🚀' },

  // VIT
  { id: 'early_rise', label: 'Встал до 7 утра', stat: 'vit', durationMinutes: 5, difficulty: 'normal', emoji: '🌅' },
  { id: 'healthy_day', label: 'Здоровое питание день', stat: 'vit', durationMinutes: 10, difficulty: 'normal', emoji: '🥗' },
  { id: 'meditation', label: 'Медитация 10 мин', stat: 'vit', durationMinutes: 10, difficulty: 'normal', emoji: '🧘' },
  { id: 'sleep_8h', label: '8 часов сна', stat: 'vit', durationMinutes: 480, difficulty: 'normal', emoji: '😴' },
  { id: 'cold_shower', label: 'Холодный душ', stat: 'vit', durationMinutes: 5, difficulty: 'hard', emoji: '🚿' },

  // WIL
  { id: 'fear_action', label: 'Сделал то, чего боялся', stat: 'wil', durationMinutes: 15, difficulty: 'hard', emoji: '⚡' },
  { id: 'no_social', label: 'Весь день без соцсетей', stat: 'wil', durationMinutes: 1440, difficulty: 'hard', emoji: '🚫' },
  { id: 'kept_promise', label: 'Выполнил обещание себе', stat: 'wil', durationMinutes: 30, difficulty: 'normal', emoji: '🎯' },
  { id: 'morning_hero', label: 'Встал когда не хотел', stat: 'wil', durationMinutes: 5, difficulty: 'hard', emoji: '🏋️' },
];
