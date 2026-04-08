import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCharacterStore } from '../store/useCharacterStore';
import { useProfileStore } from '../store/useProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { ALL_TITLES } from '../engine/titles';
import { SKILL_TREE, getUnlockedSkills } from '../engine/skillTree';
import { getCurrentSeason } from '../engine/seasons';
import { COLORS, STAT_COLORS, STAT_FULL_LABELS, FONTS, SPACING } from '../theme';
import { ALL_STAT_KEYS, StatKey } from '../engine/types';
import { useNavigation } from '@react-navigation/native';

type Tab = 'titles' | 'skills' | 'journal' | 'tasks' | 'books' | 'report' | 'tutorial';

export const ProfileScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('titles');
  const [journalAnswer, setJournalAnswer] = useState('');

  const { character, getWeeklyXP, actionLogs } = useCharacterStore();
  const {
    unlockedTitleIds, activeTitleId, setActiveTitle, clearNewTitles, newlyUnlockedTitleIds,
    unlockedSkillIds, unlockSkill,
    journalEntries, todayQuestion, isLoadingQuestion, loadJournalQuestion, saveJournalAnswer,
    journalTasks, isAnalyzingJournal, completeJournalTask, deleteJournalTask,
    books, addBook, updateBookProgress, updateBookStatus, completeBookPractice, addBookPractice, deleteBook,
    weeklyReports, isGeneratingReport, generateReport, shouldGenerateReport,
  } = useProfileStore();
  const { deepseekApiKey } = useSettingsStore();

  const statLevels = Object.fromEntries(
    ALL_STAT_KEYS.map((k) => [k, character.stats[k].level])
  ) as Record<StatKey, number>;

  const availableSkills = getUnlockedSkills(statLevels, unlockedSkillIds);
  const season = getCurrentSeason();

  const tabs: { id: Tab; emoji: string; label: string }[] = [
    { id: 'titles',   emoji: '🏆', label: 'Титулы' },
    { id: 'skills',   emoji: '🌳', label: 'Навыки' },
    { id: 'journal',  emoji: '📓', label: 'Дневник' },
    { id: 'tasks',    emoji: '⚔️', label: 'Задания' },
    { id: 'books',    emoji: '📚', label: 'Книги' },
    { id: 'report',   emoji: '📊', label: 'Отчёт' },
    { id: 'tutorial', emoji: '📖', label: 'Гайд' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Вкладки */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, activeTab === t.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={styles.tabEmoji}>{t.emoji}</Text>
            <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ─── ТИТУЛЫ ─────────────────────────────────────────── */}
        {activeTab === 'titles' && (
          <View>
            <Text style={styles.sectionTitle}>ТВОИ ТИТУЛЫ</Text>
            {ALL_TITLES.map((title) => {
              const isUnlocked = unlockedTitleIds.includes(title.id);
              const isActive = activeTitleId === title.id;
              const isNew = newlyUnlockedTitleIds.includes(title.id);
              return (
                <TouchableOpacity
                  key={title.id}
                  style={[
                    styles.titleCard,
                    isUnlocked && styles.titleCardUnlocked,
                    isActive && styles.titleCardActive,
                  ]}
                  onPress={() => {
                    if (isUnlocked) {
                      setActiveTitle(isActive ? null : title.id);
                      clearNewTitles();
                    }
                  }}
                  activeOpacity={isUnlocked ? 0.7 : 1}
                >
                  <Text style={[styles.titleEmoji, !isUnlocked && styles.locked]}>{isUnlocked ? title.emoji : '🔒'}</Text>
                  <View style={styles.titleInfo}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.titleName, !isUnlocked && styles.lockedText]}>{title.name}</Text>
                      {title.rare && isUnlocked && <Text style={styles.rareBadge}>РЕДКИЙ</Text>}
                      {isNew && <Text style={styles.newBadge}>НОВЫЙ!</Text>}
                    </View>
                    <Text style={[styles.titleDesc, !isUnlocked && styles.lockedText]}>{title.description}</Text>
                  </View>
                  {isActive && <Text style={styles.activeCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── НАВЫКИ ─────────────────────────────────────────── */}
        {activeTab === 'skills' && (
          <View>
            <Text style={styles.sectionTitle}>ДЕРЕВО НАВЫКОВ</Text>
            <Text style={styles.hintText}>Разблокируй пассивные бонусы к XP прокачивая статы</Text>

            {ALL_STAT_KEYS.map((statKey) => {
              const skills = SKILL_TREE.filter((s) => s.stat === statKey);
              if (!skills.length) return null;
              return (
                <View key={statKey} style={styles.skillGroup}>
                  <Text style={[styles.skillGroupTitle, { color: STAT_COLORS[statKey] }]}>
                    {STAT_FULL_LABELS[statKey]}
                  </Text>
                  {skills.map((skill) => {
                    const isUnlocked = unlockedSkillIds.includes(skill.id);
                    const isAvailable = availableSkills.some((s) => s.id === skill.id);
                    return (
                      <TouchableOpacity
                        key={skill.id}
                        style={[
                          styles.skillCard,
                          isUnlocked && styles.skillCardUnlocked,
                          isAvailable && !isUnlocked && styles.skillCardAvailable,
                        ]}
                        onPress={() => isAvailable && !isUnlocked && unlockSkill(skill.id)}
                        activeOpacity={isAvailable && !isUnlocked ? 0.7 : 1}
                      >
                        <Text style={styles.skillEmoji}>{isUnlocked ? skill.emoji : '🔒'}</Text>
                        <View style={styles.skillInfo}>
                          <Text style={[styles.skillName, (!isUnlocked && !isAvailable) && styles.lockedText]}>{skill.name}</Text>
                          <Text style={[styles.skillDesc, (!isUnlocked && !isAvailable) && styles.lockedText]}>{skill.description}</Text>
                          {!isUnlocked && (
                            <Text style={styles.skillReq}>Нужен Lv.{skill.unlockLevel} в {STAT_FULL_LABELS[skill.stat]}</Text>
                          )}
                        </View>
                        <Text style={[styles.skillBonus, { color: STAT_COLORS[statKey] }]}>+{Math.round(skill.passiveBonus * 100)}%</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {/* ─── ДНЕВНИК ─────────────────────────────────────────── */}
        {activeTab === 'journal' && (
          <View>
            <Text style={styles.sectionTitle}>ДНЕВНИК ОХОТНИКА</Text>

            {/* Вопрос дня */}
            {isLoadingQuestion ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={COLORS.accent} />
                <Text style={styles.loadingText}>Генерирую вопрос дня...</Text>
              </View>
            ) : todayQuestion ? (
              <View style={styles.journalCard}>
                <Text style={styles.journalQuestion}>{todayQuestion}</Text>
                <TextInput
                  style={styles.journalInput}
                  placeholder="Пиши откровенно..."
                  placeholderTextColor={COLORS.textMuted}
                  value={journalAnswer}
                  onChangeText={setJournalAnswer}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={[styles.saveBtn, !journalAnswer.trim() && styles.saveBtnDisabled]}
                  onPress={() => {
                    saveJournalAnswer(journalAnswer, character.stats, deepseekApiKey);
                    setJournalAnswer('');
                  }}
                  disabled={!journalAnswer.trim()}
                >
                  <Text style={styles.saveBtnText}>СОХРАНИТЬ</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.loadQuestionBtn}
                onPress={() => loadJournalQuestion(character.stats, deepseekApiKey)}
              >
                <Text style={styles.loadQuestionText}>✨ Получить вопрос дня</Text>
              </TouchableOpacity>
            )}

            {/* История */}
            <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>ИСТОРИЯ</Text>
            {journalEntries.length === 0 ? (
              <Text style={styles.emptyText}>Нет записей. Отвечай на вечерние вопросы!</Text>
            ) : (
              [...journalEntries].reverse().map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <Text style={styles.entryDate}>{entry.date}</Text>
                  <Text style={styles.entryQuestion}>{entry.question}</Text>
                  <Text style={styles.entryAnswer}>{entry.answer}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── ЗАДАНИЯ ИЗ ДНЕВНИКА ─────────────────────────── */}
        {activeTab === 'tasks' && (
          <View>
            <Text style={styles.sectionTitle}>ЗАДАНИЯ ИЗ ДНЕВНИКА</Text>
            <Text style={styles.hintText}>AI создаёт задания на основе твоих ответов в дневнике</Text>

            {isAnalyzingJournal && (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={COLORS.accent} />
                <Text style={styles.loadingText}>Анализирую ответ...</Text>
              </View>
            )}

            {journalTasks.length === 0 ? (
              <Text style={styles.emptyText}>Нет заданий. Отвечай на вопросы дневника — AI создаст задания!</Text>
            ) : (
              <>
                {/* Активные */}
                {journalTasks.filter((t) => !t.completed).length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>АКТИВНЫЕ</Text>
                    {journalTasks.filter((t) => !t.completed).map((task) => (
                      <View key={task.id} style={[styles.taskCard, { borderLeftColor: STAT_COLORS[task.stat] }]}>
                        <View style={styles.taskHeader}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <View style={styles.taskActions}>
                            <TouchableOpacity
                              style={styles.taskCompleteBtn}
                              onPress={() => completeJournalTask(task.id)}
                            >
                              <Text style={styles.taskCompleteText}>✓</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                Alert.alert(
                                  'Удалить задание?',
                                  '',
                                  [
                                    { text: 'Отмена', style: 'cancel' },
                                    { text: 'Удалить', style: 'destructive', onPress: () => deleteJournalTask(task.id) },
                                  ]
                                );
                              }}
                            >
                              <Text style={styles.taskDelete}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text style={styles.taskDesc}>{task.description}</Text>
                        <View style={styles.taskFooter}>
                          <View style={[styles.statPill, { backgroundColor: `${STAT_COLORS[task.stat]}20` }]}>
                            <Text style={[styles.statPillText, { color: STAT_COLORS[task.stat] }]}>
                              {STAT_FULL_LABELS[task.stat]}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {/* Выполненные */}
                {journalTasks.filter((t) => t.completed).length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>ВЫПОЛНЕННЫЕ</Text>
                    {journalTasks.filter((t) => t.completed).slice(-10).reverse().map((task) => (
                      <View key={task.id} style={[styles.taskCard, styles.taskCardCompleted, { borderLeftColor: STAT_COLORS[task.stat] }]}>
                        <Text style={[styles.taskTitle, styles.taskCompletedTitle]}>{task.title}</Text>
                        <Text style={styles.taskCompletedDate}>
                          {task.completedAt ? new Date(task.completedAt).toLocaleDateString('ru-RU') : ''}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ─── КНИГИ ─────────────────────────────────────────── */}
        {activeTab === 'books' && (
          <View>
            <Text style={styles.sectionTitle}>БИБЛИОТЕКА</Text>
            <Text style={styles.hintText}>AI рекомендует книги на основе твоих слабых мест</Text>

            {books.length === 0 ? (
              <Text style={styles.emptyText}>Нет книг. Отвечай на вопросы дневника — AI посоветует книги!</Text>
            ) : (
              <>
                {/* Читаю сейчас */}
                {books.filter((b) => b.status === 'reading').length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>ЧИТАЮ СЕЙЧАС</Text>
                    {books.filter((b) => b.status === 'reading').map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onUpdateProgress={(page) => updateBookProgress(book.id, page)}
                        onAddPractice={(desc) => addBookPractice(book.id, desc)}
                        onCompletePractice={(practiceId) => completeBookPractice(book.id, practiceId)}
                        onDelete={() => {
                          Alert.alert('Удалить книгу?', '', [
                            { text: 'Отмена', style: 'cancel' },
                            { text: 'Удалить', style: 'destructive', onPress: () => deleteBook(book.id) },
                          ]);
                        }}
                      />
                    ))}
                  </>
                )}

                {/* В списке */}
                {books.filter((b) => b.status === 'want').length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>В СПИСКЕ</Text>
                    {books.filter((b) => b.status === 'want').map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onUpdateProgress={(page) => updateBookProgress(book.id, page)}
                        onAddPractice={(desc) => addBookPractice(book.id, desc)}
                        onCompletePractice={(practiceId) => completeBookPractice(book.id, practiceId)}
                        onDelete={() => {
                          Alert.alert('Удалить книгу?', '', [
                            { text: 'Отмена', style: 'cancel' },
                            { text: 'Удалить', style: 'destructive', onPress: () => deleteBook(book.id) },
                          ]);
                        }}
                      />
                    ))}
                  </>
                )}

                {/* Прочитано */}
                {books.filter((b) => b.status === 'completed').length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>ПРОЧИТАНО</Text>
                    {books.filter((b) => b.status === 'completed').slice(-5).reverse().map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onUpdateProgress={(page) => updateBookProgress(book.id, page)}
                        onAddPractice={(desc) => addBookPractice(book.id, desc)}
                        onCompletePractice={(practiceId) => completeBookPractice(book.id, practiceId)}
                        onDelete={() => {
                          Alert.alert('Удалить книгу?', '', [
                            { text: 'Отмена', style: 'cancel' },
                            { text: 'Удалить', style: 'destructive', onPress: () => deleteBook(book.id) },
                          ]);
                        }}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ─── ОТЧЁТ ─────────────────────────────────────────── */}
        {activeTab === 'report' && (
          <View>
            <Text style={styles.sectionTitle}>ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ</Text>

            {shouldGenerateReport() && !isGeneratingReport && (
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={() => {
                  const recentLogs = actionLogs.slice(0, 50).map((l) => ({
                    description: l.description,
                    stat: l.stat,
                    finalXP: l.finalXP,
                  }));
                  generateReport(character.stats, getWeeklyXP(), recentLogs, deepseekApiKey);
                }}
              >
                <Text style={styles.generateBtnText}>📊 Сгенерировать отчёт недели</Text>
              </TouchableOpacity>
            )}

            {isGeneratingReport && (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={COLORS.accent} />
                <Text style={styles.loadingText}>Анализирую неделю...</Text>
              </View>
            )}

            {weeklyReports.length === 0 ? (
              <Text style={styles.emptyText}>Отчёты генерируются каждое воскресенье.</Text>
            ) : (
              [...weeklyReports].reverse().map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  <Text style={styles.reportWeek}>Неделя с {report.weekStart}</Text>
                  <Text style={styles.reportXP}>+{report.totalXP} XP за неделю</Text>
                  <Text style={styles.reportSummary}>{report.summary}</Text>

                  {report.highlights.length > 0 && (
                    <>
                      <Text style={styles.reportSubtitle}>🏆 Достижения</Text>
                      {report.highlights.map((h, i) => (
                        <Text key={i} style={styles.reportItem}>• {h}</Text>
                      ))}
                    </>
                  )}

                  {report.suggestions.length > 0 && (
                    <>
                      <Text style={styles.reportSubtitle}>💡 На следующую неделю</Text>
                      {report.suggestions.map((s, i) => (
                        <Text key={i} style={styles.reportItem}>• {s}</Text>
                      ))}
                    </>
                  )}

                  {report.topStat && (
                    <Text style={styles.reportStat}>
                      🔝 Топ стат: <Text style={{ color: STAT_COLORS[report.topStat] }}>{STAT_FULL_LABELS[report.topStat]}</Text>
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── ТУТОРИАЛ ─────────────────────────────────────────── */}
        {activeTab === 'tutorial' && <TutorialContent />}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Карточка книги ─────────────────────────────────────────────────────────

interface BookCardProps {
  book: import('../engine/types').Book;
  onUpdateProgress: (page: number) => void;
  onAddPractice: (description: string) => void;
  onCompletePractice: (practiceId: string) => void;
  onDelete: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onUpdateProgress, onAddPractice, onCompletePractice, onDelete }) => {
  const [showPracticeInput, setShowPracticeInput] = useState(false);
  const [practiceText, setPracticeText] = useState('');
  const [pageInput, setPageInput] = useState('');

  const progressPercent = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  const statusLabels = {
    want: 'В списке',
    reading: 'Читаю',
    completed: 'Прочитано',
  };

  const statusColors = {
    want: COLORS.textMuted,
    reading: COLORS.accent,
    completed: COLORS.success,
  };

  return (
    <View style={[styles.bookCard, { borderLeftColor: STAT_COLORS[book.relatedStat] }]}>
      <View style={styles.bookHeader}>
        <View style={styles.bookTitleRow}>
          <Text style={styles.bookEmoji}>📕</Text>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookAuthor}>{book.author}</Text>
          </View>
        </View>
        <View style={styles.bookStatus}>
          <Text style={[styles.bookStatusText, { color: statusColors[book.status] }]}>
            {statusLabels[book.status]}
          </Text>
        </View>
      </View>

      <View style={styles.bookMeta}>
        <View style={[styles.statPill, { backgroundColor: `${STAT_COLORS[book.relatedStat]}20` }]}>
          <Text style={[styles.statPillText, { color: STAT_COLORS[book.relatedStat] }]}>
            {STAT_FULL_LABELS[book.relatedStat]}
          </Text>
        </View>
        {book.category && <Text style={styles.bookCategory}>{book.category}</Text>}
      </View>

      {/* Прогресс чтения */}
      {book.status !== 'want' && (
        <View style={styles.bookProgress}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Прогресс</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: STAT_COLORS[book.relatedStat] }]} />
          </View>
          <View style={styles.pageInputRow}>
            <Text style={styles.pageLabel}>Стр:</Text>
            <TextInput
              style={styles.pageInput}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              value={pageInput}
              onChangeText={setPageInput}
              keyboardType="number-pad"
              onSubmitEditing={() => {
                const page = parseInt(pageInput);
                if (!isNaN(page)) {
                  onUpdateProgress(page);
                  setPageInput('');
                }
              }}
            />
            {book.totalPages === 0 && (
              <TextInput
                style={[styles.pageInput, { width: 60 }]}
                placeholder="Всего"
                placeholderTextColor={COLORS.textMuted}
                value={book.totalPages > 0 ? String(book.totalPages) : ''}
                onChangeText={(text) => {
                  const pages = parseInt(text);
                  if (!isNaN(pages)) {
                    onUpdateProgress(book.currentPage);
                  }
                }}
                keyboardType="number-pad"
              />
            )}
          </View>
        </View>
      )}

      {/* Заметки / причина рекомендации */}
      {book.notes && <Text style={styles.bookNotes}>💡 {book.notes}</Text>}

      {/* Практики из книги */}
      {book.practices.length > 0 && (
        <View style={styles.practicesSection}>
          <Text style={styles.practicesTitle}>Практики:</Text>
          {book.practices.map((practice) => (
            <TouchableOpacity
              key={practice.id}
              style={[styles.practiceItem, practice.completed && styles.practiceCompleted]}
              onPress={() => !practice.completed && onCompletePractice(practice.id)}
              activeOpacity={practice.completed ? 1 : 0.7}
            >
              <Text style={[styles.practiceText, practice.completed && styles.practiceCompletedText]}>
                {practice.completed ? '✓ ' : '○ '}{practice.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Добавить практику */}
      <TouchableOpacity
        style={styles.addPracticeBtn}
        onPress={() => setShowPracticeInput(!showPracticeInput)}
      >
        <Text style={styles.addPracticeText}>
          {showPracticeInput ? 'Скрыть' : '+ Добавить практику'}
        </Text>
      </TouchableOpacity>

      {showPracticeInput && (
        <View style={styles.practiceInputContainer}>
          <TextInput
            style={styles.practiceInput}
            placeholder="Опиши практику из книги..."
            placeholderTextColor={COLORS.textMuted}
            value={practiceText}
            onChangeText={setPracticeText}
            multiline
          />
          <TouchableOpacity
            style={[styles.practiceSaveBtn, !practiceText.trim() && styles.practiceSaveBtnDisabled]}
            onPress={() => {
              if (practiceText.trim()) {
                onAddPractice(practiceText);
                setPracticeText('');
                setShowPracticeInput(false);
              }
            }}
            disabled={!practiceText.trim()}
          >
            <Text style={styles.practiceSaveText}>Добавить</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Кнопки статуса */}
      <View style={styles.bookActions}>
        {book.status === 'want' && (
          <TouchableOpacity
            style={[styles.bookActionBtn, { backgroundColor: COLORS.accent }]}
            onPress={() => onUpdateProgress(1)}
          >
            <Text style={styles.bookActionText}>Начать читать</Text>
          </TouchableOpacity>
        )}
        {book.status === 'reading' && (
          <TouchableOpacity
            style={[styles.bookActionBtn, { backgroundColor: COLORS.success }]}
            onPress={() => onUpdateProgress(book.totalPages > 0 ? book.totalPages : book.currentPage + 1)}
          >
            <Text style={styles.bookActionText}>Завершить</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.bookActionBtn, styles.bookDeleteBtn]} onPress={onDelete}>
          <Text style={styles.bookDeleteText}>Удалить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const TutorialContent: React.FC = () => (
  <View>
    <Text style={styles.sectionTitle}>ГАЙД ОХОТНИКА</Text>

    {TUTORIAL_SECTIONS.map((section, i) => (
      <View key={i} style={styles.tutorialCard}>
        <Text style={styles.tutorialTitle}>{section.emoji} {section.title}</Text>
        <Text style={styles.tutorialBody}>{section.body}</Text>
      </View>
    ))}
  </View>
);

const TUTORIAL_SECTIONS = [
  {
    emoji: '⚡',
    title: 'XP и уровни',
    body: `Каждое реальное действие приносит XP.\nФормула: XP = Базовый × Сложность × Стрик × Комбо × Убывание\n\nБазовый XP зависит от длительности и стата.\nЧем выше уровень стата — тем меньше XP от обычных действий (убывающая отдача).`,
  },
  {
    emoji: '🔥',
    title: 'Стрик',
    body: `Действие каждый день увеличивает стрик:\n× 3 дня → +10% XP\n× 7 дней → +25% XP\n× 14 дней → +50% XP\n× 30 дней → ×2 XP\n× 60 дней → ×2.5 XP\n\nПропустил день — стрик сбрасывается!`,
  },
  {
    emoji: '🎯',
    title: 'Комбо',
    body: `Прокачивай несколько статов в один день для комбо-бонуса:\n× 3 разных стата → +10% XP\n× 6 статов → +25% XP\n× 9 статов → +50% XP\n\nГармоничное развитие — ключ к силе!`,
  },
  {
    emoji: '⚔️',
    title: 'Сложность действия',
    body: `Оценивай действие честно:\n- Лёгкое (easy): привычное, рутинное → ×0.75\n- Обычное (normal): требует усилий → ×1.0\n- Сложное (hard): вызов, выход из зоны комфорта → ×1.5\n\nЧем выше уровень — тем тяжелее получить "hard".`,
  },
  {
    emoji: '📋',
    title: 'Квесты',
    body: `Ежедневные квесты меняются каждую ночь.\nВыполни 7/7 квестов — без штрафа.\nНе выполнил — -20 XP за каждый пропущенный.\n\nСюжетные квесты — цели на 1-2 недели.\nБоссы — масштабные достижения жизни.`,
  },
  {
    emoji: '📉',
    title: 'Деградация',
    body: `Если долго не прокачивать стат — он деградирует:\n- Здоровье: 3 дня без активности\n- Харизма: 5 дней\n- Сила/Соц. жизнь: 7 дней\n- Карма: 10 дней\n- Бизнес: 10 дней\n- Воля: 4 дня\n- Интеллект: 14 дней\n- Стиль: 21 день\n\nПоддерживай все статы в форме!`,
  },
  {
    emoji: '🌟',
    title: 'Сезоны',
    body: `Каждый месяц — новый сезон с бонусным статом.\n+30% XP к стату сезона весь месяц.\n\nАпрель → Сила\nМай/Октябрь → Бизнес\nИюнь → Харизма\nИюль → Стиль\nСентябрь → Интеллект...`,
  },
  {
    emoji: '🌳',
    title: 'Дерево навыков',
    body: `Достигни нужного уровня стата → разблокируй пассивный навык.\nНавыки дают постоянный бонус +5-15% XP к стату.\n\nПервый навык: Lv.5\nВторой: Lv.15\nТретий: Lv.25`,
  },
  {
    emoji: '🏆',
    title: 'Титулы',
    body: `Достигай уровней и стриков — получай уникальные титулы.\nАктивный титул отображается на экране Героя.\n\nРедкие титулы (фиолетовые) — за особые достижения.\nВыбирай тот, которым гордишься больше всего!`,
  },
  {
    emoji: '📓',
    title: 'Дневник',
    body: `Каждый вечер AI-коуч задаёт вопрос для рефлексии.\nОтвечай честно — это помогает понять себя.\n\nИстория записей хранится 365 дней.\nОтвечай регулярно для роста осознанности.`,
  },
  {
    emoji: '🤖',
    title: 'AI интеграция',
    body: `Приложение использует DeepSeek AI.\nПросто опиши своё действие текстом:\n"Сегодня сделал 100 отжиманий и прочитал 50 страниц"\n\nAI автоматически определит:\n- Категорию стата (или несколько)\n- Сложность\n- Длительность\n- Бонусные очки за достижения`,
  },
  {
    emoji: '⚔️',
    title: 'Задания из дневника',
    body: `AI анализирует твои ответы в дневнике и создаёт конкретные задания.\n\nПример:\nВопрос: "Если бы твоя жизнь зависела от одного навыка..."
Ответ: "Харизма. Она открывает много дорог..."
→ AI создаёт задания на прокачку не стеснительности, обаяния и упорства.\n\nЗадания привязаны к слабым местам которые AI находит в твоих ответах.`,
  },
  {
    emoji: '📚',
    title: 'Библиотека',
    body: `AI рекомендует книги на основе твоих слабых мест.\n\nКаждая книга:\n- Прогресс чтения (страницы)\n- Практики из книги (чеклист)\n- Заметки и причины рекомендации\n\nКниги из разных сфер — не только бизнес и саморазвитие.`,
  },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 100 },

  tabsScroll: { flexGrow: 0, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  tabsRow: { flexDirection: 'row', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, gap: SPACING.xs },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
  },
  tabBtnActive: { backgroundColor: `${COLORS.accent}20` },
  tabEmoji: { fontSize: 16 },
  tabLabel: { fontSize: FONTS.size.sm, color: COLORS.textMuted, fontWeight: FONTS.weight.medium },
  tabLabelActive: { color: COLORS.accent },

  sectionTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  hintText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },

  // Титулы
  titleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    opacity: 0.5,
  },
  titleCardUnlocked: { opacity: 1 },
  titleCardActive: { borderColor: COLORS.accent, backgroundColor: `${COLORS.accent}10` },
  titleEmoji: { fontSize: 28 },
  titleInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  titleName: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, color: COLORS.text },
  titleDesc: { fontSize: FONTS.size.xs, color: COLORS.textMuted },
  rareBadge: { fontSize: 9, color: COLORS.accentPurple, backgroundColor: `${COLORS.accentPurple}20`, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  newBadge: { fontSize: 9, color: COLORS.warning, backgroundColor: `${COLORS.warning}20`, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  activeCheck: { fontSize: 20, color: COLORS.accent },
  locked: { opacity: 0.4 },
  lockedText: { color: COLORS.textDim },

  // Навыки
  skillGroup: { marginBottom: SPACING.lg },
  skillGroupTitle: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold, letterSpacing: 1, marginBottom: SPACING.sm },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
    opacity: 0.4,
  },
  skillCardUnlocked: { opacity: 1, borderColor: COLORS.success },
  skillCardAvailable: { opacity: 1, borderColor: COLORS.accent },
  skillEmoji: { fontSize: 24 },
  skillInfo: { flex: 1 },
  skillName: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold, color: COLORS.text, marginBottom: 2 },
  skillDesc: { fontSize: FONTS.size.xs, color: COLORS.textMuted },
  skillReq: { fontSize: FONTS.size.xs, color: COLORS.accent, marginTop: 2 },
  skillBonus: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.black },

  // Дневник
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, backgroundColor: COLORS.card, borderRadius: 12, marginBottom: SPACING.md },
  loadingText: { color: COLORS.textMuted, fontSize: FONTS.size.sm },
  journalCard: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, padding: SPACING.lg, marginBottom: SPACING.lg },
  journalQuestion: { fontSize: FONTS.size.md, color: COLORS.text, fontWeight: FONTS.weight.medium, marginBottom: SPACING.md, lineHeight: 22 },
  journalInput: { backgroundColor: COLORS.bg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cardBorder, color: COLORS.text, padding: SPACING.md, minHeight: 100, fontSize: FONTS.size.sm, textAlignVertical: 'top', marginBottom: SPACING.md },
  saveBtn: { backgroundColor: COLORS.accent, borderRadius: 8, padding: SPACING.md, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: COLORS.cardBorder },
  saveBtnText: { color: COLORS.white, fontWeight: FONTS.weight.bold, letterSpacing: 1 },
  loadQuestionBtn: { backgroundColor: `${COLORS.accent}20`, borderRadius: 12, borderWidth: 1, borderColor: `${COLORS.accent}40`, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.lg },
  loadQuestionText: { color: COLORS.accent, fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  entryCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder, padding: SPACING.md, marginBottom: SPACING.sm },
  entryDate: { fontSize: FONTS.size.xs, color: COLORS.textMuted, marginBottom: 4 },
  entryQuestion: { fontSize: FONTS.size.xs, color: COLORS.accent, marginBottom: 6, fontStyle: 'italic' },
  entryAnswer: { fontSize: FONTS.size.sm, color: COLORS.text, lineHeight: 20 },

  // Отчёт
  generateBtn: { backgroundColor: `${COLORS.accent}20`, borderRadius: 12, borderWidth: 1, borderColor: `${COLORS.accent}40`, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.lg },
  generateBtnText: { color: COLORS.accent, fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  reportCard: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, padding: SPACING.lg, marginBottom: SPACING.lg },
  reportWeek: { fontSize: FONTS.size.xs, color: COLORS.textMuted, marginBottom: 4 },
  reportXP: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.black, color: COLORS.accent, marginBottom: SPACING.sm },
  reportSummary: { fontSize: FONTS.size.sm, color: COLORS.text, lineHeight: 20, marginBottom: SPACING.md },
  reportSubtitle: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold, color: COLORS.text, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  reportItem: { fontSize: FONTS.size.sm, color: COLORS.textMuted, lineHeight: 20, marginBottom: 2 },
  reportStat: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginTop: SPACING.sm },

  // Туториал
  tutorialCard: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, padding: SPACING.lg, marginBottom: SPACING.md },
  tutorialTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, color: COLORS.text, marginBottom: SPACING.sm },
  tutorialBody: { fontSize: FONTS.size.sm, color: COLORS.textMuted, lineHeight: 20 },

  // Задания из дневника
  taskCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder, borderLeftWidth: 4, padding: SPACING.md, marginBottom: SPACING.sm },
  taskCardCompleted: { opacity: 0.6 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.xs },
  taskTitle: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold, color: COLORS.text, flex: 1 },
  taskCompletedTitle: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  taskCompleteBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  taskCompleteText: { color: COLORS.white, fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  taskDelete: { fontSize: FONTS.size.lg, color: COLORS.textMuted, padding: 4 },
  taskDesc: { fontSize: FONTS.size.sm, color: COLORS.textMuted, lineHeight: 18, marginBottom: SPACING.sm },
  taskFooter: { flexDirection: 'row', alignItems: 'center' },
  taskCompletedDate: { fontSize: FONTS.size.xs, color: COLORS.textMuted, marginTop: 2 },

  // Книги
  bookCard: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder, borderLeftWidth: 4, padding: SPACING.md, marginBottom: SPACING.md },
  bookHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  bookTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  bookEmoji: { fontSize: FONTS.size.xl },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, color: COLORS.text },
  bookAuthor: { fontSize: FONTS.size.xs, color: COLORS.textMuted },
  bookStatus: { paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  bookStatusText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold },
  bookMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  bookCategory: { fontSize: FONTS.size.xs, color: COLORS.textMuted, fontStyle: 'italic' },
  bookProgress: { marginBottom: SPACING.sm },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: FONTS.size.xs, color: COLORS.textMuted },
  progressPercent: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold, color: COLORS.accent },
  progressBar: { height: 6, backgroundColor: COLORS.bg, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.sm },
  progressFill: { height: '100%', borderRadius: 3 },
  pageInputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pageLabel: { fontSize: FONTS.size.xs, color: COLORS.textMuted },
  pageInput: { backgroundColor: COLORS.bg, borderRadius: 6, borderWidth: 1, borderColor: COLORS.cardBorder, color: COLORS.text, padding: SPACING.xs, width: 50, fontSize: FONTS.size.sm, textAlign: 'center' },
  bookNotes: { fontSize: FONTS.size.sm, color: COLORS.textMuted, lineHeight: 18, marginBottom: SPACING.sm, fontStyle: 'italic' },
  practicesSection: { marginBottom: SPACING.sm },
  practicesTitle: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold, color: COLORS.textMuted, marginBottom: SPACING.xs },
  practiceItem: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm, backgroundColor: `${COLORS.accent}10`, borderRadius: 6, marginBottom: 4 },
  practiceCompleted: { backgroundColor: `${COLORS.success}20` },
  practiceText: { fontSize: FONTS.size.sm, color: COLORS.text },
  practiceCompletedText: { color: COLORS.success, textDecorationLine: 'line-through' },
  addPracticeBtn: { paddingVertical: SPACING.xs, marginBottom: SPACING.sm },
  addPracticeText: { fontSize: FONTS.size.sm, color: COLORS.accent, fontWeight: FONTS.weight.medium },
  practiceInputContainer: { marginBottom: SPACING.sm },
  practiceInput: { backgroundColor: COLORS.bg, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cardBorder, color: COLORS.text, padding: SPACING.md, minHeight: 60, fontSize: FONTS.size.sm, textAlignVertical: 'top', marginBottom: SPACING.sm },
  practiceSaveBtn: { backgroundColor: COLORS.accent, borderRadius: 8, padding: SPACING.md, alignItems: 'center' },
  practiceSaveBtnDisabled: { backgroundColor: COLORS.cardBorder },
  practiceSaveText: { color: COLORS.white, fontWeight: FONTS.weight.bold, letterSpacing: 1 },
  bookActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  bookActionBtn: { flex: 1, borderRadius: 8, padding: SPACING.md, alignItems: 'center' },
  bookActionText: { color: COLORS.white, fontWeight: FONTS.weight.bold, fontSize: FONTS.size.sm },
  bookDeleteBtn: { backgroundColor: COLORS.cardBorder },
  bookDeleteText: { color: COLORS.textMuted, fontWeight: FONTS.weight.bold, fontSize: FONTS.size.sm },

  // Stat pill (переиспользуется)
  statPill: { borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  statPillText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold },
});
