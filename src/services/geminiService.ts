import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  // 搜索书籍列表
  // Future: Replace with database query if a designated database is available.
  async searchBooks(query: string, language: string = '中文') {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `用户正在搜索书籍：“${query}”。请寻找以“${language}”发表/出版的原生书籍。
      返回3-5本最相关的书籍。
      【语言要求】：所有返回的字段内容（书名、作者、出版社、目录、摘要）必须使用中文！
      输出格式必须为JSON数组，每个对象包含：
      - title: 书名
      - author: 作者
      - publisher: 出版社
      - publishDate: 出版日期
      - summary: 150字左右的深度简介（涵盖内容梗概、作品地位或评价等）`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              publisher: { type: Type.STRING },
              publishDate: { type: Type.STRING },
              summary: { type: Type.STRING }
            },
            required: ["title", "author", "publisher", "publishDate", "summary"]
          }
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return JSON.parse(response.text);
  },

  // 生成书籍完整目录
  async generateBookDetails(bookInfo: { title: string; author: string }, onChunk?: (text: string) => void) {
    let rawBookId = `${bookInfo.title}_${bookInfo.author}`.replace(/[^a-zA-Z0-9]/g, '_');
    // Ensure it's not empty, not just underscores, and doesn't start with reserved patterns
    if (!rawBookId || /^_+$/.test(rawBookId) || rawBookId.startsWith('__')) {
        rawBookId = 'book_' + Math.random().toString(36).substring(2, 10);
    }
    const bookId = `toc_${rawBookId}`;
    const tocRef = doc(db, "book_toc", bookId);
    const tocSnap = await getDoc(tocRef);

    if (tocSnap.exists()) {
      return tocSnap.data();
    }

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite-preview",
      contents: `请为书籍《${bookInfo.title}》（作者：${bookInfo.author}）生成完整、精确的正文章节目录。
      
      【语言要求】：必须使用中文。
      【内容要求】：只保留正文章节。请务必排除“序言”、“前言”、“引言”、“附注”、“总结”、“后记”、“跋”等非正文内容。
      
      输出格式必须为JSON对象，包含：
      - toc: 完整、精确的原书籍正文章节目录数组。必须包含原书所有的正文章节（例如《西游记》必须是100回，《红楼梦》必须是120回）。不要省略、不要合并、不要只提取主要章节。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            toc: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["toc"]
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text || "";
      fullText += text;
      if (onChunk) onChunk(text);
    }
    const result = JSON.parse(fullText);
    await setDoc(tocRef, result);
    return result;
  },

  // 生成测试题目
  async generateQuestions(params: {
    bookTitle: string;
    range: string[];
    count: number;
    type: string; // "单选", "多选", "混合"
    bias: string;
    examMode: boolean;
    language: string;
    userProfile?: {
      ageGroup: string;
      readingPurpose: string;
      expertiseLevel: string;
    };
  }, onChunk?: (text: string) => void) {
    const typeInstruction = params.type === '混合' 
      ? '请随机混合单选题和多选题' 
      : `请全部生成${params.type}题`;

    const profileContext = params.userProfile ? `
      【用户画像定制】（极其重要）：
      - 年龄阶段：${params.userProfile.ageGroup}（请根据此调整语言风格和情境设定。例如：少年组应使用更生动、具象的语言；成年组应侧重逻辑严密性。）
      - 阅读目的：${params.userProfile.readingPurpose}（请根据此调整题目侧重点。例如：考试考证应加强记忆与理解；学术研究应增加推理与辩证。）
      - 专业程度：${params.userProfile.expertiseLevel}（请根据此调整难度梯度。例如：入门级应侧重基础概念；专家级应挑战极限思维和深层逻辑。）
    ` : "";

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-lite-preview",
      contents: `你是一位专业的阅读指导老师。请根据以下参数为书籍《${params.bookTitle}》生成阅读测试题：
      - 测试范围：${params.range.join(', ')}
      - 题量：${params.count}题
      - 题型要求：${typeInstruction}
      - 出题偏向：${params.bias}
      - 应试强化：${params.examMode ? '开启（请参考网络公布的应试考题风格）' : '关闭'}
      - 目标语言：${params.language}
      ${profileContext}
      
      【出题分布要求】（非常重要）：
      你必须确保生成的 ${params.count} 道题目，**完全均匀、等量地分布**在用户选择的测试范围（${params.range.join(', ')}）中。
      例如，如果用户选择了5个章节，要求出10道题，那么每个章节必须精确地出2道题。绝不能随机抽取章节出题，必须覆盖所有选中的章节。
      
      【语言要求】（非常重要）：
      1. 题目内容 (question) 和 选项 (options) 必须使用 ${params.language} 编写！如果目标语言是英文，则必须全是英文！
      2. 详细解析 (analysis) 必须使用 中文 编写！
      
      请严格遵守测试范围，不要超出设定的章节。
      输出格式必须为JSON数组，每个对象包含：
      - question: 题目内容 (${params.language})
      - options: 选项数组（固定4个选项，${params.language}）
      - correctAnswer: 正确答案（单选题为选项内容字符串，多选题为选项内容字符串数组，例如 ["选项A", "选项B"]）
      - isMultiple: 布尔值，是否为多选题
      - analysis: 详细解析 (中文)
      - bias: 考察的能力维度（${params.bias}）
      - source: 题目来源（AI原创 或 网络应试题）`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { 
                description: "Correct answer(s). String for single, Array of strings for multiple.",
                anyOf: [
                  { type: Type.STRING },
                  { type: Type.ARRAY, items: { type: Type.STRING } }
                ]
              },
              isMultiple: { type: Type.BOOLEAN },
              analysis: { type: Type.STRING },
              bias: { type: Type.STRING },
              source: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "isMultiple", "analysis", "bias", "source"]
          }
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text || "";
      fullText += text;
      if (onChunk) onChunk(text);
    }
    return JSON.parse(fullText);
  },

  // 生成综合评价
  async generateEvaluation(results: any[], userProfile?: {
    ageGroup: string;
    readingPurpose: string;
    expertiseLevel: string;
  }) {
    const correctCount = results.filter(r => r.isCorrect).length;
    const totalCount = results.length;
    const profileContext = userProfile ? `
      【用户背景】：
      - 年龄：${userProfile.ageGroup}
      - 阅读目的：${userProfile.readingPurpose}
      - 专业程度：${userProfile.expertiseLevel}
      请根据这些背景信息，提供更具针对性的鼓励和建议。
    ` : "";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `用户完成了阅读测试，正确率为 ${correctCount}/${totalCount}。以下是答题详情：${JSON.stringify(results)}。
      ${profileContext}
      请给出一个100字以内的综合评价。
      要求：
      1. 观点重点突出，表述简单明了。
      2. 语气幽默风趣，带一点调侃或鼓励。
      3. 分析阅读表现并给出1-2条实用的后续建议。
      4. 必须使用中文。`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return response.text;
  },

  // 获取个性化书籍推荐
  async getRecommendedBooks(profile: {
    occupation: string;
    readingPreferences: string[];
  }) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `用户画像：
      - 职业：${profile.occupation}
      - 阅读偏好：${profile.readingPreferences.join('、')}
      
      请根据以上信息，为用户推荐 5 本最适合他们的书籍，并说明推荐理由。
      【语言要求】：必须使用中文。
      输出格式必须为JSON数组，每个对象包含：
      - title: 书名
      - author: 作者
      - reason: 推荐理由（结合职业和偏好）`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["title", "author", "reason"]
          }
        }
      }
    });
    return JSON.parse(response.text);
  },

  // 生成语音播报
  async generateSpeech(text: string, language: string) {
    // Select voice based on language
    let voiceName = 'Kore'; // Default
    if (language === '中文' || language === '日语' || language === '韩语') {
      voiceName = 'Kore'; // Kore is generally good for Asian languages
    } else if (language === '英文' || language === '德语') {
      voiceName = 'Puck'; 
    } else if (language === '法语' || language === '西班牙语' || language === '葡萄牙语') {
      voiceName = 'Charon';
    } else {
      voiceName = 'Zephyr';
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Please read the following text naturally in ${language}: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Failed to generate audio");
    }
    return base64Audio;
  }
};
