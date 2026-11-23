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
  'public-failure': {
    title: 'Неудача на глазах у всех',
    story: 'На важном выступлении всё пошло не по плану. Ошибку заметили другие, и теперь герою нужно решить, как вернуться к делу.',
    responses: [
      { label: 'Разобрать ошибку публично', hint: 'Будет неловко, зато это может вернуть доверие и научить не прятаться от сложностей.',
        outcome: 'Герой признал ошибку и объяснил, что попробует изменить.', immediate: [-5, 0],
        followup: 'Через несколько месяцев героя снова позвали участвовать — уже с учётом прошлого опыта.', later: [6, 0], trait: 'open',
        skills: { resilience: 1, communication: 1 } },
      { label: 'Отказаться от подобных выступлений', hint: 'Станет спокойнее, но возможностей проявить себя будет меньше.',
        outcome: 'Герой отказался от публичных задач и выбрал работу в стороне от внимания.', immediate: [-2, 0],
        followup: 'Тишина помогла восстановиться, но возвращаться к прежней уверенности пришлось дольше.', later: [2, 0], trait: 'careful',
        skills: { resilience: 1 } },
    ],
  },
  'work-mistake': {
    title: 'Ошибка на работе',
    story: 'Из-за ошибки героя сорвался важный заказ. Руководитель предлагает либо исправить всё в короткий срок, либо передать дело другому.',
    responses: [
      { label: 'Остаться и исправить', hint: 'Придётся задержаться и признать свою ответственность. Ошибка может стать уроком, но сил уйдёт много.',
        outcome: 'Герой остался разбираться с последствиями и попросил проверить расчёты.', immediate: [-6, -1],
        followup: 'Заказ удалось спасти. Руководитель не забыл ошибку, но стал доверять внимательности героя больше.', later: [5, 1], trait: 'persistent',
        skills: { practical: 2, resilience: 1 } },
      { label: 'Скрыть свою часть ошибки', hint: 'Сейчас будет проще сохранить силы, но позднее последствия могут стать тяжелее.',
        outcome: 'Герой промолчал о своей ошибке, надеясь, что её не заметят.', immediate: [-1, 0],
        followup: 'Ошибка обнаружилась позже. Доверие коллег снизилось, а исправлять ситуацию пришлось в одиночку.', later: [-7, -2], trait: 'independent',
        skills: { practical: 1 } },
    ],
  },
  'debt-notice': {
    title: 'Пришло требование об оплате',
    story: 'Счёт, который долго откладывали, вырос из-за просрочки. Теперь нельзя сделать вид, что проблемы не существует.',
    responses: [
      { label: 'Договориться о рассрочке', hint: 'Придётся признаться в трудностях и несколько месяцев жить с жёстким бюджетом.',
        outcome: 'Герой связался с организацией и договорился платить небольшими частями.', immediate: [-4, -1],
        followup: 'Долг не исчез быстро, но перестал расти. Каждый платёж возвращал немного контроля.', later: [4, 2], trait: 'careful',
        skills: { practical: 2 } },
      { label: 'Избегать звонков и писем', hint: 'Сегодня станет легче, но сумма и давление продолжат расти.',
        outcome: 'Герой отложил письма и решил разобраться позже.', immediate: [-2, 0],
        followup: 'Проблема стала крупнее, и теперь на её решение ушёл почти весь запас.', later: [-6, -4], trait: 'independent',
        skills: { resilience: -1 } },
    ],
  },
  'family-distance': {
    title: 'Близкие стали далеко',
    story: 'После переезда или многолетней занятости семья почти перестала общаться. Никто не поссорился напрямую, но связь истончилась.',
    responses: [
      { label: 'Назначить регулярный разговор', hint: 'Придётся защищать это время от работы и привычной усталости.',
        outcome: 'Герой предложил созваниваться в один и тот же день и не переносить разговоры без причины.', immediate: [-2, 0],
        followup: 'Разговоры не вернули прежнюю близость сразу, но в жизни снова появились общие новости.', later: [5, 0], trait: 'supportive',
        skills: { empathy: 2 } },
      { label: 'Оставить всё как есть', hint: 'Не придётся ничего менять, но расстояние может стать привычным.',
        outcome: 'Герой решил, что отношения восстановятся сами, когда появится время.', immediate: [1, 0],
        followup: 'Годы прошли незаметно. Встретиться снова оказалось труднее, чем казалось.', later: [-5, 0], trait: 'independent',
        skills: { resilience: -1 } },
    ],
  },
  'friend-needs-help': {
    title: 'Друг просит о помощи',
    story: 'Друг оказался в тяжёлой ситуации и просит героя вмешаться. Помощь отнимет время и может поставить под угрозу собственные планы.',
    responses: [
      { label: 'Поддержать лично', hint: 'Свои дела придётся отложить. Дружба станет глубже, но нагрузка увеличится.',
        outcome: 'Герой приехал, выслушал друга и помог пройти первые трудные дни.', immediate: [-5, 0],
        followup: 'Друг запомнил, что герой не исчез в трудный момент. Позже он первым предложил помощь в ответ.', later: [7, 1], trait: 'supportive',
        skills: { empathy: 2, resilience: 1 } },
      { label: 'Помочь найти других людей', hint: 'Герой не сможет быть рядом постоянно, зато помощь не будет зависеть от одного человека.',
        outcome: 'Герой связал друга со специалистами и другими знакомыми.', immediate: [-2, 0],
        followup: 'Поддержка распределилась между несколькими людьми, и дружба не превратилась в изматывающую обязанность.', later: [5, 0], trait: 'resourceful',
        skills: { practical: 1, empathy: 1 } },
    ],
  },
  'health-scare': {
    title: 'Тревожный результат обследования',
    story: 'Врач назначил дополнительные проверки. Пока ничего не ясно, но ожидание результатов изменило обычный распорядок.',
    responses: [
      { label: 'Не пропускать обследования', hint: 'Придётся потратить время и часть денег, зато неопределённость станет меньше.',
        outcome: 'Герой записался на повторные обследования и попросил близкого сходить вместе.', immediate: [-4, -1],
        followup: 'Результаты потребовали наблюдения, но теперь было понятно, что делать дальше.', later: [5, 0], trait: 'careful',
        skills: { practical: 1, resilience: 1 } },
      { label: 'Отложить визиты', hint: 'Сейчас сохранится привычный ритм, но неизвестность и риск останутся.',
        outcome: 'Герой отложил обследования, надеясь, что самочувствие улучшится.', immediate: [-1, 0],
        followup: 'Возвращаться к врачу пришлось позже, когда тревога и усталость стали сильнее.', later: [-6, -2], trait: 'independent',
        skills: { resilience: -1 } },
    ],
  },
  'community-conflict': {
    title: 'Конфликт в общем деле',
    story: 'Люди, с которыми герой делал важный проект, поссорились. Без решения работа остановится, а отношения могут распасться.',
    responses: [
      { label: 'Собрать всех и договориться', hint: 'Герою придётся выслушать несколько сторон и взять на себя неприятную роль посредника.',
        outcome: 'Герой предложил каждому объяснить свою позицию и разделил спорное решение на части.', immediate: [-4, 0],
        followup: 'Проект завершили не идеально, но люди снова смогли работать рядом.', later: [6, 0], trait: 'open',
        skills: { communication: 1, empathy: 1 } },
      { label: 'Выйти из проекта', hint: 'Напряжение уменьшится, но часть людей воспримет уход как предательство.',
        outcome: 'Герой вышел из общего дела и оставил спор другим.', immediate: [1, 0],
        followup: 'Стало спокойнее, но несколько связей уже не восстановились.', later: [-3, 0], trait: 'careful',
        skills: { resilience: 1 } },
    ],
  },
  'missed-opportunity': {
    title: 'Возможность ушла',
    story: 'Герой узнал, что подходящее место или обучение досталось кому-то другому. Нельзя понять, был ли шанс единственным.',
    responses: [
      { label: 'Попросить обратную связь', hint: 'Ответ может быть неприятным, зато покажет, чему учиться дальше.',
        outcome: 'Герой попросил объяснить, чего не хватило, и записал конкретные шаги.', immediate: [-4, 0],
        followup: 'Через год похожая возможность появилась снова, и герой подошёл к ней подготовленнее.', later: [6, 0], trait: 'persistent',
        skills: { practical: 1, resilience: 2 } },
      { label: 'Сделать вид, что это неважно', hint: 'Боль станет тише, но причины неудачи останутся неизвестными.',
        outcome: 'Герой решил не возвращаться к этой теме и продолжил привычный путь.', immediate: [-2, 0],
        followup: 'Позже герой снова вспомнил об упущенном шансе, когда изменить что-то стало сложнее.', later: [-4, 0], trait: 'careful',
        skills: { resilience: -1 } },
    ],
  },
  'moral-whistleblowing': {
    title: 'Нарушение на работе',
    story: 'Герой заметил, что в отчётах скрывают проблему. Если рассказать правду, пострадают коллеги и проект. Если промолчать, риск останется.',
    responses: [
      { label: 'Сообщить о проблеме', hint: 'Доверие к герою может вырасти, но карьерный путь временно замедлится.',
        outcome: 'Герой сообщил о нарушении и настоял на проверке.', immediate: [-4, -1],
        followup: 'Проверка заняла время. Ошибку исправили, но не все коллеги простили вмешательство.', later: [4, 0],
        trait: 'careful', skills: { resilience: 1, practical: 1 } },
      { label: 'Остаться в стороне', hint: 'Работа продолжится без конфликта, но герой будет помнить о своём молчании.',
        outcome: 'Герой решил не вмешиваться и сосредоточился на своей части работы.', immediate: [1, 0],
        followup: 'Проблема проявилась позже. Герой сохранил место, но стал меньше доверять коллективу.', later: [-3, 1],
        trait: 'independent', skills: { resilience: -1 } },
    ],
  },
  'moral-family-time': {
    title: 'Помощь семье или важный шанс',
    story: 'Близкому нужна регулярная помощь именно тогда, когда герою предлагают участие в важном проекте.',
    responses: [
      { label: 'Выбрать помощь семье', hint: 'Шанс может не повториться, зато близкий не останется один.',
        outcome: 'Герой отказался от части проекта и освободил время для семьи.', immediate: [-2, 0],
        followup: 'Проект завершили без героя, но близкий почувствовал, что на него можно положиться.', later: [6, 0],
        trait: 'supportive', skills: { empathy: 2 } },
      { label: 'Принять участие в проекте', hint: 'Дополнительные возможности улучшат будущее, но сейчас помощи будет меньше.',
        outcome: 'Герой принял предложение и договорился о посильной помощи семье.', immediate: [-5, 2],
        followup: 'Проект открыл новые связи. Семье пришлось искать поддержку ещё у нескольких людей.', later: [2, 1],
        trait: 'persistent', skills: { practical: 1 } },
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
  if (age >= 14 * 12) candidates.push('public-failure');
  if (age >= 18 * 12) candidates.push('family-distance', 'community-conflict', 'missed-opportunity');
  if (age >= 18 * 12 && hasFriend) candidates.push('friend-needs-help');
  if (age >= 40 * 12) candidates.push('health-scare');
  if (age >= 18 * 12 && employed) candidates.push('work-mistake');
  if (age >= 18 * 12 && life.development.funds <= 1) candidates.push('debt-notice');
  if (previous.some((event) => event.type === 'romance' && event.step === 'end'
    && event.ageInMonths === age - 1)) candidates.push('relationship-breakup');
  if (age >= 65 * 12) candidates.push('changing-routine');
  if (age >= 25 * 12 && employed) candidates.push('moral-whistleblowing');
  if (age >= 25 * 12 && life.parents.some(({ diedAt }) => diedAt === undefined)) candidates.push('moral-family-time');
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
    return { ...next, [skill]: Math.max(0, Math.min(100, next[skill] + (value ?? 0))) };
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
