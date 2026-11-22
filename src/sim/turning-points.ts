import { remember } from './relationships';
import type { LifeSnapshot } from './life';
import { drawRandom } from './random';
import type { Skill } from './growth';

type Impact = readonly [mood: number, funds: number];

interface Response {
  readonly label: string;
  readonly hint: string;
  readonly outcome: string;
  readonly immediate: Impact;
  readonly followup: string;
  readonly later: Impact;
  readonly trait: TraitId;
  readonly skills?: Readonly<Partial<Record<Skill, number>>>;
}

interface Scenario {
  readonly title: string;
  readonly story: string;
  readonly responses: readonly [Response, Response];
}

export type TraitId = 'persistent' | 'resourceful' | 'supportive' | 'open' | 'careful' | 'independent';

export const turningPoints = {
  'broken-project': {
    title: 'Проект пришлось начать заново',
    story: 'Накануне школьной выставки макет сломался. До показа осталось несколько дней.',
    responses: [
      { label: 'Собрать заново', hint: 'Работа отнимет силы сейчас. Через два месяца появится шанс показать результат.',
        outcome: 'Герой решил начать заново, хотя времени почти не осталось.', immediate: [-4, 0],
        followup: 'Учитель показал новый макет следующему классу. Усилия героя пригодились другим.', later: [7, 0], trait: 'persistent' },
      { label: 'Попросить ребят помочь', hint: 'Вместе будет легче. Часть работы придётся доверить другим.',
        outcome: 'Одноклассники согласились помочь, и работу переделали сообща.', immediate: [2, 0],
        followup: 'На следующей выставке ребята сами позвали героя в команду.', later: [4, 0], trait: 'open' },
    ],
  },
  'excluded-from-game': {
    title: 'В игру больше не позвали',
    story: 'Ребята во дворе договорились о новой игре и не позвали героя. На следующий день все встретились снова.',
    responses: [
      { label: 'Предложить свою игру', hint: 'Понадобится смелость. Кто-то может откликнуться, даже если вся группа не вернётся.',
        outcome: 'Герой предложил сыграть по новым правилам.', immediate: [-3, 0],
        followup: 'Несколько ребят вспомнили идею и предложили попробовать её снова.', later: [5, 0], trait: 'resourceful' },
      { label: 'Провести время с тем, кто остался один', hint: 'Герой побудет рядом с кем-то, кого тоже оставили в стороне.',
        outcome: 'Герой нашёл компанию у ребят, которых тоже не позвали.', immediate: [1, 0],
        followup: 'Постепенно у них появились свои игры и шутки.', later: [4, 0], trait: 'supportive' },
    ],
  },
  'friend-conflict': {
    title: 'Друг перестал отвечать',
    story: 'После ссоры близкий друг начал избегать встреч. Герою предстоит решить, с чего начать.',
    responses: [
      { label: 'Предложить поговорить', hint: 'Разговор может быть неловким. Через два месяца появится возможность снова встретиться.',
        outcome: 'Герой первым предложил встретиться и выслушал друга.', immediate: [-2, 0],
        followup: 'Друг снова написал. После разговора стало легче встречаться без напряжения.', later: [6, 0], trait: 'open' },
      { label: 'Дать друг другу время', hint: 'Сейчас станет спокойнее. В ближайшие месяцы встреч будет меньше.',
        outcome: 'Герой решил не продолжать ссору и взял паузу.', immediate: [2, 0],
        followup: 'Получилось смотреть на ссору спокойнее, хотя общение пока остаётся редким.', later: [-1, 0], trait: 'careful' },
    ],
  },
  'school-pressure': {
    title: 'Слишком много заданий',
    story: 'Подготовка к экзамену совпала с другими дедлайнами. Привычный распорядок перестал работать.',
    responses: [
      { label: 'Составить план подготовки', hint: 'Первые недели будут сложными, зато позже появится ощущение, что дело движется.',
        outcome: 'Герой разбил подготовку на небольшие задачи.', immediate: [-3, 0],
        followup: 'Пробный экзамен показал, что подготовка понемногу приносит результат.', later: [6, 0], trait: 'persistent' },
      { label: 'Попросить перенести часть сроков', hint: 'Нагрузка уменьшится. Позже нужно будет вернуться к отложенным заданиям.',
        outcome: 'Герой объяснил ситуацию, и часть заданий удалось отложить.', immediate: [3, 0],
        followup: 'Сроки снова подошли, но теперь хватило времени взяться за дело.', later: [2, 0], trait: 'resourceful' },
    ],
  },
  'new-class': {
    title: 'Класс расформировали',
    story: 'Школа объединила несколько групп. Привычные места и знакомые лица остались в другом кабинете.',
    responses: [
      { label: 'Первым заговорить с ребятами', hint: 'Поначалу будет неловко. Знакомство может облегчить первые недели.',
        outcome: 'Герой познакомился с ребятами за соседней партой.', immediate: [-3, 0],
        followup: 'На перемене уже оказалось с кем поговорить.', later: [6, 0], trait: 'open' },
      { label: 'Освоиться в своём темпе', hint: 'Можно сначала привыкнуть к новым правилам и сохранить старые связи.',
        outcome: 'Герой спокойно освоился и договорился встречаться со старыми знакомыми после уроков.', immediate: [1, 0],
        followup: 'С новым классом стало проще, когда появился привычный распорядок.', later: [3, 0], trait: 'independent' },
    ],
  },
  'home-repairs': {
    title: 'Дома произошла протечка',
    story: 'С потолка начала капать вода. Часть вещей пришлось быстро перенести, а комнатой пока нельзя пользоваться.',
    responses: [
      { label: 'Оплатить срочную помощь', hint: 'Уйдёт до 4 единиц запаса. Дом быстрее вернётся в порядок.',
        outcome: 'Герой нашёл мастера и оплатил срочный ремонт.', immediate: [2, -4],
        followup: 'Стены высохли, и вещи вернулись на свои места.', later: [5, 0], trait: 'careful' },
      { label: 'Временно перестроить быт', hint: 'Несколько недель будет неудобно. Сбережения останутся на другие нужды.',
        outcome: 'Герой перенёс нужные вещи и устроил временное место для домашних дел.', immediate: [-5, 0],
        followup: 'Оказалось, что с новым распорядком можно дождаться ремонта без срочной траты.', later: [4, 0], trait: 'resourceful' },
    ],
  },
  'lost-job': {
    title: 'Работу пришлось оставить',
    story: 'После сокращения заказов работодатель закрыл часть рабочих мест. Теперь нужно решить, что делать дальше.',
    responses: [
      { label: 'Искать подработку через знакомых', hint: 'Начать разговоры непросто. Через два месяца может появиться разовая оплата.',
        outcome: 'Герой рассказал знакомым, что ищет работу.', immediate: [-2, 0],
        followup: 'Знакомый предложил разовую подработку. Она помогла пережить перебои с доходом.', later: [4, 2], trait: 'open' },
      { label: 'Пересмотреть расходы и искать самостоятельно', hint: 'Ожидание будет тревожным. Позже экономия частично восстановит запас.',
        outcome: 'Герой составил бюджет и начал искать вакансии.', immediate: [-3, 0],
        followup: 'Пересмотр расходов помог удержаться на плаву, пока поиск продолжается.', later: [2, 1], trait: 'independent' },
    ],
  },
  'unexpected-expense': {
    title: 'Неожиданные расходы',
    story: 'Сломалась вещь, которой дома пользовались каждый день. Замена сразу ударит по бюджету.',
    responses: [
      { label: 'Оплатить замену', hint: 'Из запаса уйдёт до 3 единиц. Быт наладится быстрее.',
        outcome: 'Герой оплатил замену из сбережений.', immediate: [2, -3],
        followup: 'После замены домашние дела снова идут по привычному распорядку.', later: [4, 0], trait: 'careful' },
      { label: 'Попробовать обойтись ремонтом', hint: 'Временно будет неудобно. Через два месяца станет понятно, помог ли ремонт.',
        outcome: 'Герой нашёл, где можно починить вещь, и отложил покупку.', immediate: [-4, 0],
        followup: 'Отремонтированная вещь снова работает. Покупку удалось отложить.', later: [5, 0], trait: 'resourceful' },
    ],
  },
  'care-for-relative': {
    title: 'Близкому нужна помощь',
    story: 'Кто-то из близких столкнулся с трудным периодом и попросил помощи с повседневными делами.',
    responses: [
      { label: 'Выделить время на помощь', hint: 'Часть своих дел придётся отложить. Позже близкий вспомнит эту помощь.',
        outcome: 'Герой взял на себя часть повседневных дел близкого.', immediate: [-4, 0],
        followup: 'Когда стало легче, близкий поблагодарил героя за то, что рядом было на кого опереться.', later: [7, 0], trait: 'supportive' },
      { label: 'Распределить помощь между знакомыми', hint: 'Придётся договариваться, зато каждый возьмёт посильную часть.',
        outcome: 'Герой созвонился со знакомыми и составил очередь помощи.', immediate: [-2, 0],
        followup: 'Помощь по очереди сработала. Никому не пришлось справляться со всем одному.', later: [5, 0], trait: 'resourceful' },
    ],
  },
  'unfamiliar-city': {
    title: 'Новый город пока не стал домом',
    story: 'После переезда знакомые остались далеко, а местные дела по-прежнему отнимают силы. Герой решает, за что взяться первым.',
    responses: [
      { label: 'Сходить на встречу соседей', hint: 'Придётся выйти из привычного круга. Новые знакомства могут помочь освоиться.',
        outcome: 'Герой сходил на встречу во дворе и завязал разговор.', immediate: [-2, 0],
        followup: 'В районе появились знакомые лица. Выходить из дома стало приятнее.', later: [6, 0], trait: 'open' },
      { label: 'Составить собственный распорядок', hint: 'Поначалу в нём будет мало общения. Зато появится привычный ритм.',
        outcome: 'Герой выбрал знакомый маршрут и нашёл время на свои дела.', immediate: [1, 0],
        followup: 'Привычные маршруты и занятия сделали недели предсказуемее.', later: [3, 0], trait: 'independent' },
    ],
  },
  'changing-routine': {
    title: 'Привычные дела стали утомлять',
    story: 'Несколько раз подряд обычные дела отнимали весь день. Старый распорядок больше не оставляет времени и сил на близких.',
    responses: [
      { label: 'Попросить близких помочь с делами', hint: 'Придётся обсудить, какая помощь нужна. Часть времени освободится.',
        outcome: 'Герой рассказал близким, какие дела даются труднее всего.', immediate: [-1, 0],
        followup: 'Удалось договориться о помощи и снова найти время для встреч.', later: [6, 0], trait: 'open' },
      { label: 'Упростить распорядок', hint: 'От части привычных дел придётся отказаться. Останется время на самое важное.',
        outcome: 'Герой оставил в расписании только самое нужное.', immediate: [2, 0],
        followup: 'В новом распорядке появилось время отдыхать между делами.', later: [3, 0], trait: 'careful' },
    ],
  },
  'regular-place-closes': {
    title: 'Закрылось знакомое место',
    story: 'Место, где герой регулярно встречался со знакомыми, закрылось. Привычный круг общения может распасться.',
    responses: [
      { label: 'Предложить встречаться в другом месте', hint: 'Нужно будет собрать людей снова. Позже встречи могут возобновиться.',
        outcome: 'Герой написал знакомым и предложил новое место.', immediate: [-2, 0],
        followup: 'На первую встречу пришли несколько человек. Новая привычка начала складываться.', later: [6, 0], trait: 'open' },
      { label: 'Сохранить связь с несколькими близкими', hint: 'Больших встреч станет меньше, зато останется время на личные разговоры.',
        outcome: 'Герой договорился видеться с теми, кто был особенно близок.', immediate: [1, 0],
        followup: 'Общий круг стал меньше, но отдельные дружеские связи сохранились.', later: [3, 0], trait: 'supportive' },
    ],
  },
  'friend-betrayal': {
    title: 'Доверие оказалось нарушено',
    story: 'Друг рассказал другим то, чем герой делился только наедине. Теперь нужно решить, как жить с этой обидой и границами.',
    responses: [
      { label: 'Поговорить прямо', hint: 'Разговор может закончиться болезненно, но поможет понять, можно ли восстановить доверие.',
        outcome: 'Герой спокойно объяснил, почему это было больно, и выслушал ответ.', immediate: [-5, 0],
        followup: 'Извинения не отменили случившееся, но между ними появились более честные границы.', later: [4, 0], trait: 'open',
        skills: { empathy: 1 } },
      { label: 'Отдалиться', hint: 'Станет одиноко, зато появится пространство для безопасности и новых связей.',
        outcome: 'Герой перестал делиться личным и оставил отношения на расстоянии.', immediate: [-2, 0],
        followup: 'Со временем стало спокойнее. Не всякая близость обязана продолжаться.', later: [3, 0], trait: 'careful',
        skills: { resilience: 1 } },
    ],
  },
  'family-financial-crisis': {
    title: 'Денег стало не хватать',
    story: 'Доходов семьи оказалось недостаточно для привычных расходов. Несколько решений придётся принимать в условиях постоянной тревоги.',
    responses: [
      { label: 'Попросить помощи у близких', hint: 'Придётся признаться, что самостоятельно не справиться. Поддержка уменьшит ближайшее давление.',
        outcome: 'Герой честно рассказал о положении и попросил о временной помощи.', immediate: [-3, 3],
        followup: 'Помощь не решила все проблемы, но позволила пережить самый острый период.', later: [5, 0], trait: 'open',
        skills: { empathy: 1 } },
      { label: 'Сократить всё необязательное', hint: 'Запас сохранится, но несколько месяцев жизнь будет заметно теснее.',
        outcome: 'Герой пересмотрел расходы и отказался от части привычных вещей.', immediate: [-5, 0],
        followup: 'Новый бюджет оказался строгим, зато дал ощущение, что ситуация снова под контролем.', later: [4, 1], trait: 'resourceful',
        skills: { practical: 2 } },
    ],
  },
  'serious-illness-in-family': {
    title: 'Близкий серьёзно заболел',
    story: 'Кому-то из семьи понадобились обследования и помощь в повседневных делах. Будущее стало неопределённым.',
    responses: [
      { label: 'Взять заботу на себя', hint: 'Своих сил станет меньше, но близкий не останется один.',
        outcome: 'Герой перестроил распорядок и взял на себя часть заботы.', immediate: [-7, 0],
        followup: 'Болезнь не исчезла сразу, но близкий знал: рядом есть человек, которому можно доверять.', later: [7, 0], trait: 'supportive',
        skills: { empathy: 2 } },
      { label: 'Организовать помощь вместе', hint: 'Придётся просить других и координировать дела, зато нагрузка не ляжет на одного человека.',
        outcome: 'Герой собрал родственников и знакомых и распределил помощь.', immediate: [-4, 0],
        followup: 'Забота стала общей. Было трудно, но никто не нёс всё в одиночку.', later: [6, 0], trait: 'resourceful',
        skills: { practical: 1, empathy: 1 } },
    ],
  },
  'failed-exam': {
    title: 'Экзамен не сдан',
    story: 'Результат оказался хуже ожидаемого. На повторную попытку нужно время, а привычный план учёбы больше не работает.',
    responses: [
      { label: 'Подготовиться ещё раз', hint: 'Придётся отложить часть планов и признать, что прежнего подхода было недостаточно.',
        outcome: 'Герой разобрал ошибки и составил новый план подготовки.', immediate: [-5, 0],
        followup: 'Повторная попытка прошла лучше. Неудача осталась частью истории, но перестала быть её концом.', later: [6, 0], trait: 'persistent',
        skills: { resilience: 2, academics: 1 } },
      { label: 'Выбрать другой путь', hint: 'Образовательный маршрут изменится, зато не придётся бесконечно возвращаться к одному экзамену.',
        outcome: 'Герой отказался от прежнего маршрута и стал искать практическую альтернативу.', immediate: [-2, 0],
        followup: 'Новый путь оказался не похож на первоначальный план, но дал первые реальные результаты.', later: [5, 0], trait: 'resourceful',
        skills: { practical: 2 } },
    ],
  },
  'relationship-breakup': {
    title: 'Отношения закончились',
    story: 'После расставания привычные планы и общие места стали напоминать о том, что изменилось. Нужно решить, как пережить первые месяцы.',
    responses: [
      { label: 'Поговорить напоследок', hint: 'Разговор может причинить боль, но поможет поставить честную точку.',
        outcome: 'Герой встретился и выслушал друг друга без попытки вернуть прошлое.', immediate: [-6, 0],
        followup: 'Со временем воспоминания перестали каждый раз превращаться в новую ссору.', later: [6, 0], trait: 'open',
        skills: { empathy: 1, resilience: 1 } },
      { label: 'Сразу сменить распорядок', hint: 'Первые недели будут пустыми. Новые занятия помогут не возвращаться к прежней жизни каждый вечер.',
        outcome: 'Герой убрал из расписания общие маршруты и заполнил освободившееся время.', immediate: [-4, 0],
        followup: 'Новый распорядок не стёр прошлое, но вернул ощущение собственного пространства.', later: [5, 0], trait: 'independent',
        skills: { resilience: 2 } },
    ],
  },
  'housing-instability': {
    title: 'Жильё оказалось под угрозой',
    story: 'Запаса денег не хватает, чтобы спокойно оплатить жильё и обязательные расходы. Откладывать решение больше нельзя.',
    responses: [
      { label: 'Попросить временно принять у себя', hint: 'Придётся признаться в трудностях и согласиться на тесный, неудобный быт.',
        outcome: 'Герой попросил близких о временном месте и составил план расходов.', immediate: [-5, 2],
        followup: 'Совместный быт оказался непростым, но дал время снова найти опору.', later: [6, 0], trait: 'open',
        skills: { empathy: 1, practical: 1 } },
      { label: 'Срочно искать более дешёвое место', hint: 'Переезд будет рискованным и оставит мало сил. Зато часть расходов уменьшится.',
        outcome: 'Герой переехал в менее удобное жильё и начал восстанавливать запас.', immediate: [-7, 0],
        followup: 'Новое место не стало домом сразу, но расходы перестали расти так быстро.', later: [4, 2], trait: 'independent',
        skills: { practical: 2, resilience: 1 } },
    ],
  },
} as const satisfies Record<string, Scenario>;

export type TurningPointId = keyof typeof turningPoints;
export type ResponseIndex = 0 | 1;

export function advanceTurningPoint(life: LifeSnapshot): LifeSnapshot {
  const age = life.ageInMonths;
  if (age < 6 * 12 || life.status.type !== 'active'
    || (life.wellbeing.phase !== 'none' && life.wellbeing.phase !== 'resolved')) return life;
  const previous = life.chronicle.slice(-24);
  const last = previous.slice().reverse().find((event) => event.type === 'turning-point');
  if (last && age - last.ageInMonths < 6) return life;
  const recentWorld = previous.filter((event) => event.type === 'world' && age - event.ageInMonths <= 2);
  const employed = life.development.employment === 'entry-level' || life.development.employment === 'specialist';
  const hasFriend = life.relationships.some(({ id }) => id === 'friend');
  const candidates: TurningPointId[] = age < 18 * 12 ? ['broken-project', 'new-class', 'excluded-from-game']
    : ['care-for-relative', 'regular-place-closes'];
  if (age >= 12 * 12 && age < 18 * 12) candidates.push('school-pressure');
  if (age >= 18 * 12 && life.development.funds >= 4) candidates.push('home-repairs');
  if (age < 22 * 12 && hasFriend) candidates.push('friend-conflict');
  if (age >= 18 * 12 && life.development.funds >= 3) candidates.push('unexpected-expense');
  if (age >= 18 * 12 && employed) candidates.push('lost-job');
  if (age >= 18 * 12 && hasFriend) candidates.push('friend-betrayal');
  if (age >= 18 * 12 && life.development.funds <= 2) candidates.push('family-financial-crisis');
  if (age >= 25 * 12 && life.parents.some(({ diedAt }) => diedAt === undefined)) candidates.push('serious-illness-in-family');
  if (age >= 16 * 12 && age < 26 * 12) candidates.push('failed-exam');
  if (age >= 18 * 12 && life.development.funds === 0) candidates.push('housing-instability');
  if (previous.some((event) => event.type === 'romance' && event.step === 'end'
    && event.ageInMonths === age - 1)) candidates.push('relationship-breakup');
  if (age >= 65 * 12) candidates.push('changing-routine');
  if (recentWorld.some((event) => event.type === 'world' && event.id === 'move-paperwork' && event.ageInMonths === age - 2)) {
    candidates.push('unfamiliar-city');
  }
  const fresh = candidates.filter((id) => !life.chronicle.some(
    (event) => event.type === 'turning-point' && event.id === id,
  ));
  const linked = fresh.find((id) =>
    id === 'unfamiliar-city' || (id === 'lost-job' && recentWorld.some((event) => event.type === 'world' && event.id === 'shift-cut'))
    || (id === 'regular-place-closes' && recentWorld.some((event) => event.type === 'world' && event.id === 'community-repair'))
    || id === 'relationship-breakup',
  );
  if (!linked && (age + life.seed % 6) % 6 !== 0) return life;
  const { value } = drawRandom((life.seed ^ Math.imul(age, 0x52ed134f)) >>> 0);
  const id = linked ?? fresh[Math.floor(value * fresh.length)];
  if (!id) return life;

  return {
    ...life,
    status: { type: 'decision', decision: 'turning-point', id },
    development: id === 'lost-job' ? { ...life.development, employment: 'unemployed' } : life.development,
    wellbeing: { ...life.wellbeing, mood: Math.max(0, life.wellbeing.mood - 5) },
    chronicle: [...life.chronicle, { type: 'turning-point', id, ageInMonths: age }],
  };
}

function applyImpact(life: LifeSnapshot, impact: Impact, skillImpact: Readonly<Partial<Record<Skill, number>>> = {}): LifeSnapshot {
  const [mood, funds] = impact;
  const skills = Object.entries(skillImpact).reduce((next, [id, value]) => {
    const skill = id as Skill;
    return { ...next, [skill]: Math.min(100, next[skill] + (value ?? 0)) };
  }, { ...life.development.skills });
  return {
    ...life,
    wellbeing: { ...life.wellbeing, mood: Math.max(0, Math.min(100, life.wellbeing.mood + mood)) },
    development: { ...life.development, funds: Math.max(0, life.development.funds + funds), skills },
  };
}

export function resolveTurningPoint(life: LifeSnapshot, response: ResponseIndex): LifeSnapshot {
  if (life.status.type !== 'decision' || life.status.decision !== 'turning-point' || (response !== 0 && response !== 1)) return life;
  const { id } = life.status;
  const selected = turningPoints[id].responses[response];
  return {
    ...applyImpact(life, selected.immediate, 'skills' in selected ? selected.skills : undefined),
    status: { type: 'active' },
    chronicle: [...life.chronicle, { type: 'turning-choice', id, response, ageInMonths: life.ageInMonths }],
  };
}

export function advanceTurningConsequences(life: LifeSnapshot): LifeSnapshot {
  for (let index = life.chronicle.length - 1; index >= 0; index -= 1) {
    const event = life.chronicle[index]!;
    if (event.ageInMonths < life.ageInMonths - 2) break;
    if (event.type !== 'turning-choice' || event.ageInMonths !== life.ageInMonths - 2) continue;
    const selected = turningPoints[event.id].responses[event.response];
    const changed = applyImpact(life, selected.later, 'skills' in selected ? selected.skills : undefined);
    const relationships = event.id === 'friend-conflict'
      ? remember(life.relationships, 'friend', {
        kind: event.response === 0 ? 'shared-hardship' : 'took-distance', ageInMonths: life.ageInMonths,
      }, event.response === 0 ? 8 : -4)
      : event.id === 'care-for-relative'
        ? remember(life.relationships, 'caregiver', { kind: 'shared-hardship', ageInMonths: life.ageInMonths },
          event.response === 0 ? 8 : 4)
        : life.relationships;
    return {
      ...changed, relationships,
      chronicle: [...life.chronicle, {
        type: 'turning-consequence', id: event.id, response: event.response, ageInMonths: life.ageInMonths,
      }],
    };
  }
  return life;
}
