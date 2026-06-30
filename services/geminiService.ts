import { GoogleGenAI } from "@google/genai";
import { ModelOption, GridOption, GenerationSettings, StickerIntent } from "../types";

// Vibe Keys matching SettingsPanel
const VIBE_KEYS = {
    HIGH_ENERGY: "High Energy & Cheerful",
    LAZY: "Lazy & Chill",
    DRAMATIC: "Over-the-top Dramatic",
    WHOLESOME: "Wholesome & Healing",
    SARCASTIC: "Sarcastic & Funny",
    COUPLE: "Couple Sweet",
    OFFICE: "Office Survivor",
    THREADS_MEMES: "Threads Trending Memes",
    OFFICE_MELTDOWN: "Office Mentally Checked Out",
    NEEDY_CLINGY: "Needy & Clingy",
    ABSURD_HUMOR: "Absurd & Sarcastic Humor",
};

// 1. High Energy (24 Intents)
const INTENTS_HIGH_ENERGY: StickerIntent[] = [
    { text: "早安", description: "打招呼, 充滿朝氣", visual: "One hand waving high above head, energetic smile" },
    { text: "耶！", description: "開心, 慶祝", visual: "Jumping joyfully, Arms open wide, flowers background" },
    { text: "謝謝", description: "感謝, 感激", visual: "Blowing a kiss with hearts OR Holding a Thank You sign" },
    { text: "OK", description: "贊成, 沒問題", visual: "Big Thumbs up with one hand, sparkling eyes" },
    { text: "GO!", description: "興奮, 出發", visual: "Running forward, Dust cloud behind, fist pumping" },
    { text: "加油", description: "鼓勵, 奮鬥", visual: "Headband on, fire burning in background, intense determination" },
    { text: "收到", description: "確認, 敬禮", visual: "Saluting with right hand, standing straight" },
    { text: "恭喜", description: "慶祝, 拉炮", visual: "Pulling a party popper, Confetti everywhere" },
    { text: "哈哈", description: "大笑, 歡樂", visual: "Rolling on floor laughing, hitting floor with hand" },
    { text: "期待", description: "眼睛發光, 渴望", visual: "Hands on cheeks, starry eyes, looking forward" },
    { text: "衝啊", description: "趕路, 急忙", visual: "Running extremely fast, motion blur lines" },
    { text: "好吃", description: "美味, 享受", visual: "Holding utensils, drooling over a big meal" },
    { text: "愛你", description: "示愛, 啾咪", visual: "Winking, making a finger heart" },
    { text: "哇!!", description: "驚訝, 驚喜", visual: "Hands on face, mouth open in happy surprise" },
    { text: "早安", description: "晨間, 太陽", visual: "Stretching arms, sun rising in background" },
    { text: "晚安", description: "睡覺, 寧靜", visual: "Sleeping in a crescent moon, peaceful face" },
    { text: "好棒", description: "稱讚, 優秀", visual: "Clapping hands, sparkles around" },
    { text: "拜託", description: "請求, 無辜", visual: "Hands clasped in prayer, puppy dog eyes" },
    { text: "生日快樂", description: "祝福, 蛋糕", visual: "Holding a birthday cake with candles" },
    { text: "沒問題", description: "自信, 包在我身上", visual: "Patting chest confidently" },
    { text: "來玩", description: "招手, 邀請", visual: "Beckoning with hand, playful expression" },
    { text: "太神啦", description: "崇拜, 佩服", visual: "Bowing down in worship, shining light" },
    { text: "害羞", description: "臉紅, 靦腆", visual: "Scratching head, looking down shyly" },
    { text: "拜拜", description: "再見, 揮手", visual: "Walking away waving back, happy exit" },
];

// 2. Lazy & Chill (24 Intents)
const INTENTS_LAZY: StickerIntent[] = [
    { text: "不想動", description: "懶惰, 癱軟", visual: "Lying flat on floor like liquid, melting" },
    { text: "累...", description: "疲憊, 嘆氣", visual: "Slumping shoulders, soul leaving body slightly" },
    { text: "Zzz", description: "睡覺, 打呼", visual: "Sleeping with snot bubble, drooling" },
    { text: "隨便", description: "不在乎, 挖鼻孔", visual: "Picking nose, looking away with half-open eyes" },
    { text: "想下班", description: "不耐煩, 看手錶", visual: "Staring at watch/clock, lifeless expression" },
    { text: "餓了", description: "飢餓, 肚子叫", visual: "Rubbing empty stomach, thinking of food thought bubble" },
    { text: "已讀", description: "敷衍, 滑手機", visual: "Lying on side looking at phone, blue light reflection" },
    { text: "喔", description: "冷漠, 句點", visual: "Blank face, staring into space, one dot bubble" },
    { text: "好麻煩", description: "煩躁, 抓頭", visual: "Messing up hair, annoyed expression" },
    { text: "...", description: "放空, 發呆", visual: "Wide empty eyes, mouth slightly open, flies buzzing" },
    { text: "我就廢", description: "耍廢, 躺平", visual: "Lying on stomach using laptop/tablet, potato chips around" },
    { text: "聽不到", description: "拒絕聆聽, 耳塞", visual: "Wearing headphones/earplugs, closing eyes" },
    { text: "再說吧", description: "推託, 揮手", visual: "Dismissive hand wave, turning back" },
    { text: "不想面對", description: "逃避, 躲藏", visual: "Hiding in a cardboard box or under blanket" },
    { text: "沒救了", description: "無奈, 攤手", visual: "Shrugging shoulders, giving up" },
    { text: "慢慢來", description: "緩慢, 蝸牛", visual: "Crawling slowly, snail shell on back" },
    { text: "好喔", description: "敷衍, 讚", visual: "Giving a weak, low-effort thumbs up" },
    { text: "蛤?", description: "傻眼, 聽不懂", visual: "Tilting head, brain empty" },
    { text: "拒絕", description: "反對, 打叉", visual: "Arms crossed in X, deadpan face" },
    { text: "洗澡去", description: "洗澡, 鴨子", visual: "Soaking in tub/bucket, rubber duck on head" },
    { text: "明天見", description: "懶散告別", visual: "Half-hearted wave, walking slowly" },
    { text: "起床失敗", description: "賴床, 被窩", visual: "Burrito wrapped in blanket, refusing to emerge" },
    { text: "下線", description: "斷線, 離開", visual: "Character turns grey/black and white, disconnect symbol" },
    { text: "掰", description: "消失, 飄走", visual: "Floating away like a ghost, fading out" },
];

// 3. Over-the-top Dramatic (24 Intents)
const INTENTS_DRAMATIC: StickerIntent[] = [
    { text: "崩潰", description: "崩潰, 吶喊", visual: "Screaming like Munch's The Scream, holding face" },
    { text: "嚇死", description: "驚恐, 魂飛魄散", visual: "Soul leaving the body from mouth, pale face" },
    { text: "哪尼!?", description: "震驚, 難以置信", visual: "Extreme close-up, realistic shocked eyes, jagged lines" },
    { text: "嗚嗚", description: "大哭, 瀑布淚", visual: "Waterfall tears streaming from eyes, flooding the floor" },
    { text: "必須死", description: "憤怒, 火焰", visual: "Holding a weapon/torch, burning rage background" },
    { text: "這是什麼", description: "困惑, 瞇眼看", visual: "Squinting eyes extremely hard, looking at tiny object" },
    { text: "拜託!!", description: "跪求, 土下座", visual: "Dogeza (prostrating on ground), forehead touching floor, intense speed lines" },
    { text: "不!!!!", description: "拒絕, 爾康手", visual: "Reaching hand out dramatically, crying face" },
    { text: "太神了", description: "崇拜, 發光", visual: "Eyes shooting laser beams, holy light background" },
    { text: "噗", description: "吐血, 受傷", visual: "Coughing up a small comical amount of blood, dramatic fall" },
    { text: "被雷劈", description: "打擊, 石化", visual: "Struck by lightning, skeleton visible, shocked expression" },
    { text: "我要生氣了", description: "暴怒, 集氣", visual: "Glowing aura like Super Saiyan, veins popping" },
    { text: "笑死", description: "狂笑, 捶地", visual: "Pounding the ground with fist, laughing maniacally" },
    { text: "警察叔叔", description: "報警, 害怕", visual: "Holding a phone, looking fearful/disgusted" },
    { text: "無法直視", description: "遮眼, 害羞", visual: "Covering eyes but peeking through fingers" },
    { text: "原來如此", description: "恍然大悟", visual: "Fist hitting palm, lightbulb exploding overhead" },
    { text: "凍結", description: "冷場, 結冰", visual: "Encased in a block of ice, shivering" },
    { text: "心碎", description: "傷心, 裂開", visual: "Holding a giant heart that is cracking into two" },
    { text: "我全都要", description: "貪心, 抓取", visual: "Arms grabbing everything possible, greedy face" },
    { text: "不可以", description: "禁止, 嚴肅", visual: "Making a giant STOP sign with body, stern face" },
    { text: "太難了", description: "燒腦, 融化", visual: "Brain melting out of ears, dizzy eyes" },
    { text: "打擊", description: "陰影, 沮喪", visual: "Sitting in corner with dark cloud raining on head" },
    { text: "怎麼可能", description: "噴飯, 驚訝", visual: "Spitting out tea/drink in shock" },
    { text: "救命", description: "求救, 溺水", visual: "Hand reaching out from water/quicksand" },
];

// 4. Wholesome & Healing (24 Intents)
const INTENTS_WHOLESOME: StickerIntent[] = [
    { text: "抱抱", description: "擁抱, 溫暖", visual: "Hugging a teddy bear or invisible person, warm atmosphere" },
    { text: "辛苦了", description: "慰勞, 奉茶", visual: "Offering a cup of steaming tea, gentle smile" },
    { text: "愛你", description: "愛心, 喜歡", visual: "Holding a giant heart, blushing cheeks" },
    { text: "沒關係", description: "安慰, 摸頭", visual: "Patting someone's head, soothing expression" },
    { text: "加油", description: "打氣, 支持", visual: "Holding pom-poms, soft pastel background" },
    { text: "謝謝", description: "感謝, 鞠躬", visual: "Polite bow, flowers blooming around" },
    { text: "晚安", description: "睡覺, 雲朵", visual: "Sleeping on a cloud, stars twinkling" },
    { text: "早安", description: "起床, 伸懶腰", visual: "Waking up refreshed, birds chirping" },
    { text: "好棒", description: "讚賞, 大拇指", visual: "Soft thumbs up, sparkles" },
    { text: "乖乖", description: "撒嬌, 蹭蹭", visual: "Rubbing cheek against screen/surface lovingly" },
    { text: "收到", description: "敬禮, 可愛", visual: "Cute salute, round eyes" },
    { text: "開心", description: "旋轉, 快樂", visual: "Spinning around, musical notes floating" },
    { text: "想你", description: "思念, 托腮", visual: "Looking at sky/window, dreaming bubble" },
    { text: "驚喜", description: "禮物, 感動", visual: "Holding a gift box, happy tears" },
    { text: "好吃", description: "幸福, 咀嚼", visual: "Eating a cookie, cheeks full, yummy face" },
    { text: "OK", description: "沒問題, 眨眼", visual: "Making OK sign with fingers, winking" },
    { text: "在那邊", description: "指引, 溫柔", visual: "Pointing with a flower or stick softly" },
    { text: "可以嗎", description: "探頭, 詢問", visual: "Peeking from behind a wall/door shyly" },
    { text: "不哭", description: "擦淚, 安慰", visual: "Wiping tears with a handkerchief" },
    { text: "我也要", description: "舉手, 參與", visual: "Raising hand enthusiastically like a student" },
    { text: "歡迎", description: "撒花, 熱情", visual: "Throwing flower petals, welcome banner" },
    { text: "慢慢來", description: "放鬆, 氣球", visual: "Holding a balloon, floating gently" },
    { text: "洗澡", description: "泡泡, 放鬆", visual: "Covered in soap bubbles, ducky" },
    { text: "明天見", description: "揮手, 夕陽", visual: "Soft wave goodbye, sunset background" },
];

// 5. Sarcastic & Funny (24 Intents)
const INTENTS_SARCASTIC: StickerIntent[] = [
    { text: "呵呵", description: "冷笑, 嘲諷", visual: "Smirking, half-lidded eyes, sarcastic text bubble" },
    { text: "確?", description: "懷疑, 挑眉", visual: "Raising one eyebrow, skeptical face (The Rock style)" },
    { text: "聽你在吹", description: "吹牛, 風大", visual: "Face being blown by strong wind, hair messy" },
    { text: "慢走不送", description: "送客, 假哭", visual: "Waving a handkerchief dramatically, fake tears" },
    { text: "喔是喔", description: "白眼, 無言", visual: "Rolling eyes so far back only whites show" },
    { text: "笑死", description: "嘲笑, 指指點點", visual: "Pointing finger at viewer, laughing mockingly" },
    { text: "厲害了", description: "敷衍, 拍手", visual: "Slow clapping, bored expression" },
    { text: "蛤?", description: "裝傻, 聽不見", visual: "Cupping ear, pretending not to hear" },
    { text: "公沙小", description: "問號, 聽不懂", visual: "Surrounded by question marks, confused/annoyed face" },
    { text: "喝茶", description: "看戲, 淡定", visual: "Sipping tea, looking sideways (Kermit style)" },
    { text: "可憐哪", description: "同情, 居高臨下", visual: "Looking down with fake sympathy" },
    { text: "供三小", description: "不爽, 手勢", visual: "Hand gesture 'What are you saying?', annoyed" },
    { text: "我就爛", description: "自暴自棄, 拇指", visual: "Thumbs up but lying in trash can" },
    { text: "是在哈囉", description: "困惑, 電話", visual: "Holding phone upside down, confused look" },
    { text: "我看倒像", description: "荒謬, 香蕉", visual: "Holding a banana like a phone/gun, absurdity" },
    { text: "下去", description: "紅牌, 驅逐", visual: "Holding up a red card like a referee" },
    { text: "已知用火", description: "原始人, 落後", visual: "Dressed as caveman, holding fire torch" },
    { text: "怕爆", description: "發抖, 害怕", visual: "Shivering exaggeratedly, hugging self" },
    { text: "好了啦", description: "制止, 夠了", visual: "Hand out 'Stop' gesture, annoyed face" },
    { text: "...", description: "閉嘴, 封條", visual: "Zipping mouth shut, or duct tape on mouth" },
    { text: "看戲", description: "吃瓜, 爆米花", visual: "Eating popcorn, wearing 3D glasses" },
    { text: "傑出的一手", description: "高招, 棋子", visual: "Holding a chess piece, smug face" },
    { text: "醒醒吧", description: "打臉, 清醒", visual: "Slapping own face or screen to wake up" },
    { text: "下去領500", description: "工讀生, 錢", visual: "Holding a coin, dismissing gesture" },
];

// 6. Couple Sweet (24 Intents)
const INTENTS_COUPLE: StickerIntent[] = [
    { text: "想你", description: "思念, 甜蜜", visual: "Holding a phone close to heart, pink bubbles" },
    { text: "親一個", description: "索吻, 嘟嘴", visual: "Puckered lips, eyes closed, flying hearts" },
    { text: "等我", description: "期待見面", visual: "Running with flowers, blushing smile" },
    { text: "愛你", description: "告白, 大心", visual: "Making a big heart with arms over head" },
    { text: "在幹嘛", description: "關心, 偷看", visual: "Peeking from bottom of screen, curious eyes" },
    { text: "我也要", description: "撒嬌, 拉衣角", visual: "Tugging at an invisible sleeve, puppy eyes" },
    { text: "哼", description: "假裝生氣, 傲嬌", visual: "Puffed cheeks, arms crossed, looking away but peeking" },
    { text: "笨蛋", description: "親暱稱呼", visual: "Poking viewer's cheek lightly, playful grin" },
    { text: "可以嗎", description: "詢問, 期待", visual: "Clasped hands, sparkling background" },
    { text: "早安親親", description: "晨間驚喜", visual: "Winking, blowing a kiss with a sun icon" },
    { text: "晚安夢到我", description: "睡前情話", visual: "Hugging a pillow, sleepy but happy" },
    { text: "抱緊處理", description: "渴望擁抱", visual: "Arms wide open, running towards viewer" },
    { text: "你是我的", description: "佔有慾", visual: "Pointing at viewer with a smug, loving face" },
    { text: "我錯了", description: "求饒, 哭哭", visual: "Holding a sign 'I'm sorry', kneeling" },
    { text: "想吃那個", description: "一起去吃飯", visual: "Pointing at a menu/food, drooling cutely" },
    { text: "牽手", description: "渴望親密", visual: "Reaching out hand towards the screen" },
    { text: "最喜歡你", description: "直球告白", visual: "Surrounded by a giant exploding heart" },
    { text: "你是最好", description: "崇拜, 誇獎", visual: "Clapping with starry eyes" },
    { text: "快回來", description: "催促, 寂寞", visual: "Sitting by the door, looking like a lonely puppy" },
    { text: "啾咪", description: "可愛表情", visual: "Winking, sticking out tongue slightly" },
    { text: "我的寶", description: "寵溺", visual: "Patting the screen gently" },
    { text: "不可以", description: "吃醋, 傲嬌", visual: "Making an X with fingers, pouting" },
    { text: "帶我走", description: "想一起出門", visual: "Hanging onto someone's leg (or edge of screen)" },
    { text: "永遠在一起", description: "約定", visual: "Pinky swear gesture, warm glow" },
];

// 7. Office Survivor (24 Intents)
const INTENTS_OFFICE: StickerIntent[] = [
    { text: "不想上班", description: "社畜心聲", visual: "Wrapped in blanket, crying, alarm clock in background" },
    { text: "收到", description: "公事公辦", visual: "Deadpan face, robotic salute" },
    { text: "救命", description: "工作太多", visual: "Buried under a mountain of papers" },
    { text: "下班了!", description: "解放", visual: "Dashing out of a door, papers flying behind" },
    { text: "沒錢了", description: "月底窮困", visual: "Pulling out empty pockets, moth flying out" },
    { text: "咖啡救我", description: "依賴咖啡", visual: "Drinking coffee with huge dark circles under eyes" },
    { text: "電腦當機", description: "崩潰", visual: "Staring at a blue screen, hair standing on end" },
    { text: "開會中", description: "靈魂出竅", visual: "Sitting at desk, soul floating out of mouth" },
    { text: "好的123", description: "敷衍回覆", visual: "Typing extremely fast with a bored face" },
    { text: "想睡覺", description: "疲勞", visual: "Eyelids held up by toothpicks" },
    { text: "薪水呢", description: "渴望發薪", visual: "Staring at a calendar, drooling over money" },
    { text: "又是這句", description: "對主管不滿", visual: "Rolling eyes behind a computer monitor" },
    { text: "我太難了", description: "壓力大", visual: "Crumpled like a piece of paper" },
    { text: "已讀不回", description: "逃避公事", visual: "Hiding under the desk with a phone" },
    { text: "加油吧", description: "自勉", visual: "Wiping a single tear, holding a fist up weakly" },
    { text: "週一憂鬱", description: "Monday Blue", visual: "Blue character, melting into the chair" },
    { text: "倒數下班", description: "期待", visual: "Staring at a giant clock, sweating" },
    { text: "感謝大大", description: "求救成功", visual: "Bowing deeply towards the screen" },
    { text: "這份誰的", description: "甩鍋", visual: "Pointing away, looking suspicious" },
    { text: "沒問題...", description: "硬撐", visual: "Smiling while twitching, background on fire" },
    { text: "五點見", description: "準時下班", visual: "Ready to run, wearing a backpack" },
    { text: "我要離職", description: "幻想", visual: "Imagining flying away on a bird" },
    { text: "忙到炸", description: "極度忙碌", visual: "Character has 4 arms, all typing/calling" },
    { text: "平安退勤", description: "每日目標", visual: "Walking out into a sunset, exhausted but safe" },
];

// 8. Threads Trending Memes (24 Intents)
const INTENTS_THREADS_MEMES: StickerIntent[] = [
    { text: "觸爛", description: "極度認同, True", visual: "Nodding vigorously with glowing laser eyes and Thumbs up" },
    { text: "留友看", description: "留給朋友看, 分享", visual: "Holding up a magnifying glass pointing at screen, winking" },
    { text: "接住你", description: "溫暖支持, 共感", visual: "Catching a falling heart with a giant baseball glove or soft pillow" },
    { text: "後面有車", description: "緊張提示, 烏龍迷因", visual: "Looking back shocked with comical speed lines and sweat drops" },
    { text: "建議手臂加強", description: "反諷幽默, 歪樓", visual: "Flexing tiny comic bicep with a serious deadpan face" },
    { text: "真冰涼", description: "極度爽快, 冰飲", visual: "Holding an icy soda drink with sparkly frost surrounding" },
    { text: "暈碳", description: "吃太飽想睡, 血糖上升", visual: "Dizzy eyes spiraling, food coma slumping on desk with rice bowl" },
    { text: "要確欸", description: "懷疑人生, 確認", visual: "Squinting hard, tilting head with big question mark overhead" },
    { text: "破防了", description: "內心受傷, 防線崩潰", visual: "Shield shattering into pieces, dramatic crying face" },
    { text: "大破防", description: "嚴重打擊", visual: "Kneeling on ground with comic lightning striking background" },
    { text: "隨便你", description: "佛系, 不想管了", visual: "Meditating on a floating lotus flower, eyes closed peacefully" },
    { text: "有料", description: "稱讚有實力", visual: "Giving two thumbs up with sparkling gold stars around" },
    { text: "笑死", description: "迷因狂笑", visual: "Hitting ground laughing with tears flying" },
    { text: "已確診", description: "確診發瘋/快樂", visual: "Wearing doctor stethoscope holding a medical chart nodding" },
    { text: "什麼操作", description: "看不懂, 困惑", visual: "Scratching head with floating math equations around" },
    { text: "我真的會謝", description: "無奈道謝", visual: "Forced polite smile while holding a wilting flower" },
    { text: "尊嘟假嘟", description: "真的假的, 可愛疑問", visual: "Wide innocent puppy eyes blinking curiously" },
    { text: "狠人", description: "佩服極致", visual: "Bowing down with respect, flame aura" },
    { text: "誰懂", description: "尋求共鳴", visual: "Reaching both hands toward screen crying tears of joy" },
    { text: "沒事了", description: "安靜登出", visual: "Fading away transparently like a ghost waving goodbye" },
    { text: "太無情了", description: "無情控訴", visual: "Pointing finger with dramatically tearful eyes" },
    { text: "這很重要", description: "劃重點", visual: "Holding a giant yellow highlighter drawing a circle" },
    { text: "我看你是", description: "調侃看穿", visual: "Pushing up glasses with glowing white lenses anime style" },
    { text: "收", description: "話題終結", visual: "Clapping hands together decisively to end conversation" },
];

// 9. Office Mentally Checked Out (24 Intents)
const INTENTS_OFFICE_MELTDOWN: StickerIntent[] = [
    { text: "好的收到", description: "表面禮貌內心登出", visual: "Smiling polite face but soul is floating out of mouth" },
    { text: "精神登出", description: "放空斷線", visual: "Character eyes become TV static noise, completely frozen" },
    { text: "發瘋", description: "壓力過大失控", visual: "Running around shaking hands wildly with rainbow aura" },
    { text: "我想下班", description: "強烈願望", visual: "Pressing face against wall clock staring at 5 PM" },
    { text: "已閱讀", description: "冷漠看過", visual: "Sipping coffee staring blankly at glowing monitor" },
    { text: "又來", description: "無奈嘆氣", visual: "Facepalming heavily with dark shadow over eyes" },
    { text: "改好了", description: "修改第N版", visual: "Exhausted face covered in band-aids holding document v99" },
    { text: "急嗎", description: "詢問死線", visual: "Holding a fire extinguisher looking at burning inbox" },
    { text: "這我不會", description: "裝傻推脫", visual: "Looking away whistling innocent tune with hands behind back" },
    { text: "先不要", description: "婉拒新工作", visual: "Crossed arms X sign backing away into bushes" },
    { text: "在努力了", description: "假裝忙碌", visual: "Sweating profusely typing on keyboard with spinning wheel icon" },
    { text: "明天再說", description: "拖延戰術", visual: "Throwing papers behind shoulder walking away cheerfully" },
    { text: "尊榮社畜", description: "自嘲", visual: "Wearing a fancy golden crown while chained to office desk" },
    { text: "需要喝茶", description: "喘息充電", visual: "Slumping in chair holding massive boba bubble tea" },
    { text: "大腦當機", description: "思考停滯", visual: "Loading spinning wheel symbol on forehead, blank stare" },
    { text: "不想面對", description: "逃避現實", visual: "Hiding under blanket or inside cardboard box" },
    { text: "月底了", description: "荷包空空", visual: "Opening empty wallet with dust and small fly coming out" },
    { text: "太難了", description: "工作燒腦", visual: "Melting into a puddle on the keyboard" },
    { text: "隨風而去", description: "放棄掙扎", visual: "Floating away like a dandelion blown by wind" },
    { text: "收到了解", description: "機器人回覆", visual: "Robotic metallic face saluting stiffly" },
    { text: "心如止水", description: "看透一切", visual: "Sitting dressed as monk sipping tea while office burns around" },
    { text: "即將爆發", description: "忍耐極限", visual: "Volcano erupting on top of character's head" },
    { text: "放過我", description: "求饒", visual: "Kneeling raising white surrender flag" },
    { text: "準時閃人", description: "下班衝刺", visual: "leaving cartoon dust cloud running out exit door" },
];

// 10. Needy & Clingy (24 Intents)
const INTENTS_NEEDY_CLINGY: StickerIntent[] = [
    { text: "牽牽", description: "撒嬌牽手", visual: "Reaching out both hands cute pouting eyes asking to hold hands" },
    { text: "求關注", description: "討拍拍", visual: "Poking screen gently with tearful watery eyes" },
    { text: "不理我", description: "委屈蹲角落", visual: "Squatting in dark corner poking mushrooms with a stick" },
    { text: "抱緊處理", description: "渴望熱情擁抱", visual: "Jumping forward with arms wide open and pink heart background" },
    { text: "想你喔", description: "思念想念", visual: "Hugging a plush toy thinking of you with pink bubbles" },
    { text: "在哪裡", description: "尋找對方", visual: "Looking through binoculars peeking left and right" },
    { text: "快理我", description: "催促訊息", visual: "Tapping watch/phone repeatedly with puffed chubby cheeks" },
    { text: "陪我玩", description: "邀請互動", visual: "Holding a toy/ball wagging imaginary tail excited" },
    { text: "嗚嗚哭哭", description: "撒嬌大哭", visual: "Big round eyes welling up with giant comical teardrops" },
    { text: "最喜歡你", description: "直球告白", visual: "Massive glowing pink heart erupting from chest" },
    { text: "摸摸頭", description: "討安撫", visual: "Tilting head down closing eyes waiting for a head pat" },
    { text: "要抱抱", description: "伸手要抱", visual: "Toddler-style waddling forward arms raised up" },
    { text: "哼不理你", description: "傲嬌生氣", visual: "Turning back turning head away but peeking with one eye" },
    { text: "想見你", description: "急切期待", visual: "Pressing face against window pane waiting eagerly" },
    { text: "我超乖", description: "求稱讚", visual: "Sitting perfectly straight with sparkling halo over head" },
    { text: "啾一個", description: "送上親吻", visual: "Blowing a big kiss producing a flying heart lip mark" },
    { text: "不要走", description: "挽留拉住", visual: "Grabbing onto edge of screen or coat tail desperately" },
    { text: "餓餓了", description: "撒嬌肚子餓", visual: "Holding empty bowl and spoon looking up cutely" },
    { text: "呼呼", description: "幫忙吹吹痛痛", visual: "Blowing gently on a band-aid warm caring look" },
    { text: "一起睡", description: "溫暖被窩", visual: "Peeking out from fluffy quilt invitingly" },
    { text: "寶貝", description: "甜膩稱呼", visual: "Cheeks blushing red holding sparkles" },
    { text: "你最好的", description: "崇拜讚美", visual: "Cheering with pom-poms starry admiration eyes" },
    { text: "要乖喔", description: "溫柔叮嚀", visual: "Wagging finger gently with warm loving smile" },
    { text: "愛你貼貼", description: "臉頰蹭蹭", visual: "Rubbing chubby cheek against screen/invisible glass lovingly" },
];

// 11. Absurd & Sarcastic Humor (24 Intents)
const INTENTS_ABSURD_HUMOR: StickerIntent[] = [
    { text: "確?", description: "懷疑人生", visual: "Extreme close-up raising one eyebrow The Rock style" },
    { text: "供三小", description: "聽不懂搞怪", visual: "Surrounded by question marks wearing a confused meme face" },
    { text: "美麗精神狀態", description: "瘋癲自我感覺良好", visual: "Dancing chaotically in rain with colorful sunglasses" },
    { text: "我愛你個鬼", description: "反差吐槽", visual: "Holding a heart that suddenly turns into a boxing glove" },
    { text: "笑到往生", description: "誇張大笑", visual: "Ghost angel soul leaving body while laughing hysterically" },
    { text: "沒救了", description: "攤手放棄", visual: "Shrugging shoulders with comical explosion behind" },
    { text: "你繼續吹", description: "聽人吹牛", visual: "Holding an umbrella against a massive hurricane of wind" },
    { text: "大膽", description: "指責搞笑", visual: "Pointing gavel like a judge with dramatic spotlight" },
    { text: "嚇到吃手手", description: "驚訝啃手指", visual: "Biting whole fist wide eyes trembling" },
    { text: "看戲", description: "吃瓜群眾", visual: "Eating watermelon slices wearing 3D glasses excitedly" },
    { text: "傑出的一手", description: "讚賞陰謀", visual: "Nodding slowly with villainous shadow over eyes and smirk" },
    { text: "粗心了", description: "失誤裝傻", visual: "Cheeky wink knocking over a glass of water on purpose" },
    { text: "我就爛", description: "理直氣壯的爛", visual: "Giving enthusiastic thumbs up inside a dumpster" },
    { text: "這不科學", description: "難以置信", visual: "Measuring head with a ruler looking shocked" },
    { text: "心很累", description: "心碎疲勞", visual: "Holding a deflated red balloon sighing deeply" },
    { text: "是在哈囉", description: "無言以對", visual: "Staring blankly with crow flying across background dots" },
    { text: "幫QQ", description: "同情掉淚", visual: "Pouring bottle of water pretending to cry huge tears" },
    { text: "高手在民間", description: "佩服五體投地", visual: "Sliding on knees clapping enthusiastically" },
    { text: "你贏了", description: "甘拜下風", visual: "Handing over a golden trophy bowed head" },
    { text: "出事了", description: "完蛋驚恐", visual: "Running away with pants on fire screaming" },
    { text: "我看倒像", description: "荒謬比擬", visual: "Holding up a magnifying glass to a banana examining seriously" },
    { text: "下去", description: "裁判舉牌", visual: "Holding up a massive RED CARD blowing a referee whistle" },
    { text: "太神啦", description: "誇張膜拜", visual: "Kneeling worshipping a glowing golden potato" },
    { text: "收工", description: "瀟灑轉身", visual: "Wearing sunglasses walking away from explosion without looking back" },
];

export const getIntentsByVibe = (vibe: string): StickerIntent[] => {
    switch (vibe) {
        case VIBE_KEYS.LAZY: return INTENTS_LAZY;
        case VIBE_KEYS.DRAMATIC: return INTENTS_DRAMATIC;
        case VIBE_KEYS.WHOLESOME: return INTENTS_WHOLESOME;
        case VIBE_KEYS.SARCASTIC: return INTENTS_SARCASTIC;
        case VIBE_KEYS.COUPLE: return INTENTS_COUPLE;
        case VIBE_KEYS.OFFICE: return INTENTS_OFFICE;
        case VIBE_KEYS.THREADS_MEMES: return INTENTS_THREADS_MEMES;
        case VIBE_KEYS.OFFICE_MELTDOWN: return INTENTS_OFFICE_MELTDOWN;
        case VIBE_KEYS.NEEDY_CLINGY: return INTENTS_NEEDY_CLINGY;
        case VIBE_KEYS.ABSURD_HUMOR: return INTENTS_ABSURD_HUMOR;
        case VIBE_KEYS.HIGH_ENERGY:
        default: 
            return INTENTS_HIGH_ENERGY;
    }
};

const getIntentsForSettings = (settings: GenerationSettings): StickerIntent[] => {
    const { gridSize, customIntents, vibePreset } = settings;
    if (customIntents && customIntents.length > 0) return customIntents;
    const fullList = getIntentsByVibe(vibePreset);
    let count = gridSize as number;
    return fullList.slice(0, count);
};

export const generateStickerImage = async (
  settings: GenerationSettings,
  apiKey: string
): Promise<string> => {
  const { prompt, referenceImage, referenceImage2, gridSize, model, stylePreset, textStylePreset, vibePreset, relationshipMode } = settings;

  const isPro = model === ModelOption.NanoBananaPro || model === ModelOption.Gemini3Pro;
  const actualModelId = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

  let rows = 4, cols = 4, aspectRatio = "1:1";
  let selectedIntents = getIntentsForSettings(settings);

  if (gridSize === GridOption.Grid8) { rows = 2; cols = 4; aspectRatio = "16:9"; }
  else if (gridSize === GridOption.Grid24) { rows = 6; cols = 4; aspectRatio = "3:4"; }

  const specList = selectedIntents.map((s, i) => 
    `Slot ${i+1}: [Text: "${s.text}"] [Context: ${s.description}] [Visual: ${s.visual}]`
  ).join("\n  ");

  let referenceInstruction = `[Character Description] Create characters based on: ${prompt}`;
  if (referenceImage && referenceImage2) {
      referenceInstruction = `[DUAL REFERENCE] IMAGE 1: MAIN PROTAGONIST. IMAGE 2: SIDEKICK. Maintain strict likeness. Use both for interactions.`;
  } else if (referenceImage) {
      referenceInstruction = `[SINGLE REFERENCE] Use the provided image for the character's facial and hair features. Ensure consistency.`;
  }

  const systemPrompt = `You are a LINE sticker artist.
  
  [Task] Create a sticker sheet.
  ${referenceInstruction}
  
  [Character DNA & Context]
  - Subject: ${prompt}
  - Style: ${stylePreset}
  - Vibe: ${vibePreset}
  - Relationship Context: ${relationshipMode}
  
  [MANDATORY CHROMA-KEY GREEN SCREEN REQUIREMENT]
  CRITICAL: Regardless of the selected Art Style (${stylePreset}) or Vibe, the ENTIRE canvas background behind the stickers MUST be a solid, flat, uniform bright green (#00FF00).
  - DO NOT generate paper textures, cardboard, notebooks, gradients, shadows, or environmental scenery behind the grid.
  - Every sticker character and its white outline must float on a completely flat, solid green screen (#00FF00) background to allow clean background removal.

  [Rules]
  1. Write the EXACT text provided for each slot. Integrated with clean WHITE outline.
  2. Art Style: ${stylePreset}. Keep characters consistent across all stickers.
  3. No duplicates across slots.
  4. Layout: ${gridSize} stickers arranged cleanly in a ${rows}x${cols} grid with clear space between each slot.
  
  [Slots]
  ${specList}
  
  [Text Style] Font: ${textStylePreset}
  
  Generate the sheet.`;

  const parts: any[] = [{ text: systemPrompt }];
  if (referenceImage) {
    const m = referenceImage.match(/^data:(.+);base64,(.+)$/);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  if (referenceImage2) {
    const m = referenceImage2.match(/^data:(.+);base64,(.+)$/);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }

  const ai = new GoogleGenAI({ apiKey });
  const config: any = { imageConfig: { aspectRatio } };
  if (isPro) config.imageConfig.imageSize = "2K";

  const response = await ai.models.generateContent({ model: actualModelId, contents: { parts }, config });

  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Generation failed.");
};

export const generateSingleSticker = async (
    settings: GenerationSettings,
    targetIndex: number,
    apiKey: string
  ): Promise<string> => {
    const { prompt, referenceImage, referenceImage2, model, stylePreset, textStylePreset, vibePreset, relationshipMode } = settings;
    const allIntents = getIntentsForSettings(settings);
    const targetIntent = allIntents[targetIndex];
    
    const isPro = model === ModelOption.NanoBananaPro || model === ModelOption.Gemini3Pro;
    const actualModelId = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
    const systemPrompt = `Create a SINGLE sticker.
    [Character DNA] Subject: ${prompt}, Style: ${stylePreset}, Vibe: ${vibePreset}, Context: ${relationshipMode}
    [Target] Text: "${targetIntent?.text}", Visual: ${targetIntent?.visual}
    [Rules] Pure Green (#00FF00) bg, Thick White outline, Style: ${stylePreset}, Font: ${textStylePreset}`;
  
    const parts: any[] = [{ text: systemPrompt }];
    if (referenceImage) {
      const m = referenceImage.match(/^data:(.+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
    if (referenceImage2) {
      const m = referenceImage2.match(/^data:(.+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
  
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model: actualModelId, contents: { parts }, config: { imageConfig: { aspectRatio: "1:1" } } });
  
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Generation failed.");
  };