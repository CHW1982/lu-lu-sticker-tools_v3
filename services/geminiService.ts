import { GoogleGenAI } from "@google/genai";
import { ModelOption, GridOption, GenerationSettings, StickerIntent } from "../types";

// Vibe Keys matching SettingsPanel
const VIBE_KEYS = {
    HIGH_ENERGY: "High Energy & Cheerful",
    LAZY: "Lazy & Chill",
    DRAMATIC: "Over-the-top Dramatic",
    WHOLESOME: "Wholesome & Healing",
    SARCASTIC: "Sarcastic & Funny",
};

// 1. High Energy (Default)
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

// 2. Lazy & Chill
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
    { text: "...", description: "無言, 沉默", visual: "Three dots ..., wind blowing leaves" },
    { text: "起床失敗", description: "賴床, 被窩", visual: "Burrito wrapped in blanket, refusing to emerge" },
    { text: "下線", description: "斷線, 離開", visual: "Character turns grey/black and white, disconnect symbol" },
    { text: "掰", description: "消失, 飄走", visual: "Floating away like a ghost, fading out" },
];

// 3. Over-the-top Dramatic
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

// 4. Wholesome & Healing
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

// 5. Sarcastic & Funny
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

export const getIntentsByVibe = (vibe: string): StickerIntent[] => {
    switch (vibe) {
        case VIBE_KEYS.LAZY: return INTENTS_LAZY;
        case VIBE_KEYS.DRAMATIC: return INTENTS_DRAMATIC;
        case VIBE_KEYS.WHOLESOME: return INTENTS_WHOLESOME;
        case VIBE_KEYS.SARCASTIC: return INTENTS_SARCASTIC;
        case VIBE_KEYS.HIGH_ENERGY:
        default: 
            return INTENTS_HIGH_ENERGY;
    }
};

const getIntentsForSettings = (settings: GenerationSettings): StickerIntent[] => {
    const { gridSize, customIntents, vibePreset } = settings;
    
    // 1. If user provided custom intents (via Detailed Editor), use them strictly.
    if (customIntents && customIntents.length > 0) {
        return customIntents;
    }

    // 2. Otherwise, fetch defaults based on Vibe.
    const fullList = getIntentsByVibe(vibePreset);

    // 3. Slice according to grid size.
    let count = 16;
    if (gridSize === GridOption.Grid8) count = 8;
    else if (gridSize === GridOption.Grid24) count = 24;
    
    // Fallback if list is too short (shouldn't happen if we defined 24 for all)
    return fullList.slice(0, count);
};

export const generateStickerImage = async (
  settings: GenerationSettings,
  apiKey: string
): Promise<string> => {
  const { prompt, referenceImage, referenceImage2, gridSize, model, stylePreset, textStylePreset, vibePreset } = settings;

  // Map Models
  const isPro = model === ModelOption.NanoBananaPro || model === ModelOption.Gemini3Pro;
  const actualModelId = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

  // LINE Stickers: 8 (4x2), 16 (4x4), or 24 (4x6)
  let rows = 4;
  let cols = 4;
  let aspectRatio = "1:1";
  
  // Logic to determine intents (now Vibe-aware)
  let selectedIntents = getIntentsForSettings(settings);

  if (gridSize === GridOption.Grid8) {
    rows = 2; cols = 4; aspectRatio = "16:9";
  } else if (gridSize === GridOption.Grid24) {
    rows = 6; cols = 4; aspectRatio = "3:4"; 
  } else {
    rows = 4; cols = 4; aspectRatio = "1:1";
  }

  // Build prompt with visual enforcement and SEPARATE text/context
  const specList = selectedIntents.map((s, i) => 
    `Slot ${i+1} Context: [${s.description}]. Text to Write: [${s.text}]. Required Visual: [${s.visual}].`
  ).join("\n  ");

  // Construct Instruction based on whether reference image is provided
  // Handle Single vs Dual Character Scenarios
  let referenceInstruction = `[Character Description] Create a new character based on: ${prompt}`;

  if (referenceImage && referenceImage2) {
      // DUAL CHARACTER MODE
      referenceInstruction = `[PRIORITY INSTRUCTION: DUAL REFERENCE IMAGES]
       1. **CRITICAL**: You have been provided with TWO reference images.
          - **IMAGE 1 (First)**: THE MAIN PROTAGONIST (主角).
          - **IMAGE 2 (Second)**: THE SIDEKICK (配角).
       2. **USAGE RULES**: 
          - Most stickers should feature the **Main Protagonist** alone.
          - If the Visual/Context implies interaction (e.g. hugging, high-five, playing), show **BOTH characters** interacting.
          - You may occasionally use the Sidekick alone if the mood fits perfectly.
       3. **LIKENESS**: Capture the exact "spirit" (face, hair, clothing) of BOTH characters from their respective images.
       4. **STYLIZATION**: Apply the [${stylePreset}] style to both characters consistently.`;
  } else if (referenceImage) {
      // SINGLE CHARACTER MODE
      referenceInstruction = `[PRIORITY INSTRUCTION: REFERENCE IMAGE LIKENESS]
       1. **CRITICAL**: A reference image is provided. You MUST base the character's visual identity STRICTLY on this image.
       2. **LIKENESS (神韻)**: Capture the specific facial features, eye shape, hair style, hair color, and overall "spirit" of the subject in the photo.
       3. **STYLIZATION**: Convert the subject into the requested [${stylePreset}] style, but keep them clearly recognizable as the person/character in the photo.
       4. **CONSISTENCY**: The character must look identical in every sticker slot.
       5. **CLOTHING**: Maintain the clothing style from the reference unless the visual action requires otherwise.`;
  }

  const systemPrompt = `You are an expert LINE sticker artist.
  
  [Task]
  Create a sticker sheet for a character (or characters).
  
  ${referenceInstruction}
  
  [Generation Settings]
  - **Art Style**: ${stylePreset}
  - **Vibe/Personality**: ${vibePreset}
  - **Subject Description**: ${prompt} (Use for context, but visual details from reference images take precedence).

  [Design Rules]
  1. **Text Rendering**: You MUST write the EXACT text provided in 'Text to Write' on the sticker. 
     - **DO NOT** write the 'Context' description.
     - Text should be legible, Traditional Chinese favored (unless specified otherwise in 'Text to Write').
     - Integrated into the design with a White outline.
  2. **Anatomy & Quality**: 
     - NO DUPLICATE POSES.
     - Strictly 2 arms, 2 legs per character.
     - Pure Green (#00FF00) background.
  3. **Layout**: Exactly ${gridSize} stickers in a ${rows}x${cols} grid.
  
  [Sticker Slots to Generate]
  Follow this grid order (Left->Right, Top->Bottom):
  
  ${specList}
  
  [Text Style]
  - Font: ${textStylePreset}
  
  Generate the single image sheet now.`;

  const parts: any[] = [
    { text: systemPrompt }
  ];

  // Push Image 1 (Protagonist)
  if (referenceImage) {
    const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
        parts.push({
            inlineData: {
                mimeType: matches[1],
                data: matches[2]
            }
        });
    }
  }

  // Push Image 2 (Sidekick)
  if (referenceImage2) {
    const matches = referenceImage2.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
        parts.push({
            inlineData: {
                mimeType: matches[1],
                data: matches[2]
            }
        });
    }
  }

  const config: any = {
      imageConfig: {
          aspectRatio: aspectRatio,
      }
  };

  if (isPro) {
      config.imageConfig.imageSize = "2K"; 
  }

  // Execute Function
  const executeRequest = async () => {
     // Use the provided API Key instead of process.env
     const ai = new GoogleGenAI({ apiKey: apiKey });
     
     const response = await ai.models.generateContent({
      model: actualModelId,
      contents: {
        parts: parts,
      },
      config: config
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated.");
  };

  return await executeRequest();
};

export const generateSingleSticker = async (
    settings: GenerationSettings,
    targetIndex: number,
    apiKey: string
  ): Promise<string> => {
    const { prompt, referenceImage, referenceImage2, model, stylePreset, textStylePreset, vibePreset } = settings;
    
    // Retrieve the specific intent for this slot based on Settings
    const allIntents = getIntentsForSettings(settings);
    const targetIntent = allIntents[targetIndex];
    
    // Fallback safely
    const intentText = targetIntent?.text || "Hi";
    const intentContext = targetIntent?.description || "Sticker";
    const intentVisual = targetIntent?.visual || "Cute pose";
  
    const isPro = model === ModelOption.NanoBananaPro || model === ModelOption.Gemini3Pro;
    const actualModelId = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
    let referenceInstruction = `[Character] Create a character based on: ${prompt}`;

    if (referenceImage && referenceImage2) {
         // DUAL CHARACTER MODE for Single Sticker
         referenceInstruction = `[PRIORITY: DUAL REFERENCE]
           1. **IMAGE 1**: PROTAGONIST. **IMAGE 2**: SIDEKICK.
           2. **Spirit (神韻)**: Capture the likeness of the characters provided.
           3. **Selection**: If the Visual description implies interaction, use BOTH. Otherwise, default to PROTAGONIST unless requested otherwise.`;
    } else if (referenceImage) {
         referenceInstruction = `[PRIORITY: REFERENCE IMAGE LIKENESS]
           1. **CRITICAL**: Use the PROVIDED REFERENCE IMAGE as the absolute source of truth for the character's face and hair.
           2. **Capture the Spirit (神韻)**: The character must look like the person in the photo, adapted to the [${stylePreset}] style.`;
    }

    // We request a square image for a single sticker
    const systemPrompt = `You are an expert LINE sticker artist.
    
    [Task]
    Create a SINGLE sticker for a character.
    
    ${referenceInstruction}
    
    [Style & Context]
    - **Vibe/Personality**: ${vibePreset}
    - **Art Style**: ${stylePreset}
    
    [Sticker Requirements]
    - **Text to Write**: [${intentText}] (Strictly write this text only)
    - **Context/Mood**: [${intentContext}]
    - **Required Visual**: [${intentVisual}]
    - **Composition**: Character + Text. Pure Green (#00FF00) background. Thick WHITE OUTLINE.
    - **Anatomy**: Strictly 2 arms, 2 legs.
    
    [Text Style]
    - Font: ${textStylePreset}
    
    Generate the single sticker image now.`;
  
    const parts: any[] = [{ text: systemPrompt }];
  
    // Push Image 1
    if (referenceImage) {
      const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
          parts.push({
              inlineData: { mimeType: matches[1], data: matches[2] }
          });
      }
    }
    // Push Image 2
    if (referenceImage2) {
      const matches = referenceImage2.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
          parts.push({
              inlineData: { mimeType: matches[1], data: matches[2] }
          });
      }
    }
  
    // Use the provided API Key
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const config: any = {
        imageConfig: {
            aspectRatio: "1:1", // Single sticker is square
        }
    };
    if (isPro) config.imageConfig.imageSize = "1K"; // 1K is sufficient for single sticker
  
    const response = await ai.models.generateContent({
      model: actualModelId,
      contents: { parts: parts },
      config: config
    });
  
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated.");
  };