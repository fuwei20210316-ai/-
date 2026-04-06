import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, BookOpen, Target, GraduationCap, User, Check } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface OnboardingProps {
  onComplete: (profile: {
    ageGroup: string;
    readingPurpose: string;
    expertiseLevel: string;
    occupation: string;
    readingPreferences: string[];
  }) => void;
  displayName: string;
}

const STEPS = [
  {
    id: 'ageGroup',
    title: '您的年龄阶段？',
    impact: '💡 年龄段将决定题目的语言风格和情境设定。',
    options: [
      { label: '少年', value: '少年', icon: '🌱', detail: '18岁以下' },
      { label: '青年', value: '青年', icon: '🚀', detail: '18-35岁' },
      { label: '中年', value: '中年', icon: '🌳', detail: '36-55岁' },
      { label: '老年', value: '老年', icon: '🌅', detail: '55岁以上' },
    ]
  },
  {
    id: 'readingPurpose',
    title: '您的主要阅读目的？',
    impact: '💡 阅读目的将直接影响测试的侧重点。',
    options: [
      { label: '考试考证', value: '考试考证', icon: '📝', detail: '追求高分与考点掌握' },
      { label: '学术研究', value: '学术研究', icon: '🔍', detail: '深度挖掘与逻辑推演' },
      { label: '兴趣爱好', value: '兴趣爱好', icon: '🎨', detail: '文学鉴赏与情感共鸣' },
      { label: '职业提升', value: '职业提升', icon: '💼', detail: '实战应用与知识内化' },
    ]
  },
  {
    id: 'expertiseLevel',
    title: '您的专业程度？',
    impact: '💡 专业程度将决定初始题量和难度梯度。',
    options: [
      { label: '入门', value: '入门', icon: '🐣', detail: '初次接触，希望打好基础' },
      { label: '进阶', value: '进阶', icon: '🦅', detail: '已有基础，追求深度理解' },
      { label: '专家', value: '专家', icon: '🧠', detail: '资深人士，挑战极限思维' },
    ]
  },
  {
    id: 'occupation',
    title: '您的职业身份？',
    impact: '💡 了解您的职业，能帮助我们为您匹配更相关的训练场景。',
    options: [
      { label: '学生', value: '学生', icon: '🎓', detail: '在校学习中' },
      { label: '职场新人', value: '职场新人', icon: '💼', detail: '初入职场' },
      { label: '资深管理者', value: '资深管理者', icon: '👔', detail: '经验丰富' },
      { label: '自由职业者', value: '自由职业者', icon: '☕', detail: '灵活办公' },
      { label: '学者/研究员', value: '学者/研究员', icon: '🔬', detail: '深耕学术' },
      { label: '其他', value: '其他', icon: '👤', detail: '其他身份' },
    ]
  },
  {
    id: 'readingPreferences',
    title: '您喜好的阅读题材？',
    impact: '💡 选择您感兴趣的题材，我们将为您推荐最匹配的训练题库。',
    isMultiple: true,
    options: [
      { label: '经典文学', value: '经典文学', icon: '📚' },
      { label: '科幻奇幻', value: '科幻奇幻', icon: '🚀' },
      { label: '商业理财', value: '商业理财', icon: '💰' },
      { label: '历史哲学', value: '历史哲学', icon: '🏛️' },
      { label: '科普百科', value: '科普百科', icon: '🧬' },
      { label: '艺术美学', value: '艺术美学', icon: '🎨' },
    ]
  }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, displayName }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, any>>({});

  const isSelected = (stepId: string, value: string) => {
    const selection = selections[stepId];
    return Array.isArray(selection) ? selection.includes(value) : selection === value;
  };

  const handleSelect = (value: string) => {
    const step = STEPS[currentStep];
    if (step.isMultiple) {
      const current = selections[step.id] || [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      setSelections(prev => ({ ...prev, [step.id]: updated }));
    } else {
      setSelections(prev => ({ ...prev, [step.id]: value }));
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(selections as any);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const canContinue = step.isMultiple 
    ? (selections[step.id]?.length > 0)
    : (selections[step.id] !== undefined);

  return (
    <div className="fixed inset-0 bg-[#f5f5f0] z-[200] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#064e3b]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col h-full max-h-[92vh]">
        {/* Scrollable Content Area - Hidden Scrollbar for Premium Feel */}
        <div className="flex-grow overflow-y-auto py-6 pr-1 no-scrollbar">
          {/* Header */}
          <div className="mb-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-stone-200 text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-4"
            >
              <User className="w-3 h-3" />
              <span>欢迎加入，{displayName}</span>
            </motion.div>
            <motion.h1 
              key={`title-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl sm:text-5xl font-serif font-bold text-[#064e3b] leading-[1.2] mb-6 pt-2"
            >
              {step.title}
            </motion.h1>
            <motion.div
              key={`impact-${currentStep}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#064e3b]/5 border border-[#064e3b]/10 rounded-2xl p-4 text-left max-w-md mx-auto shadow-sm"
            >
              <p className="text-[#064e3b] text-xs sm:text-sm leading-relaxed font-medium">
                {step.impact}
              </p>
            </motion.div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="contents"
              >
                {step.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "group relative flex flex-col items-start p-6 rounded-[32px] border-2 transition-all duration-300 text-left",
                      isSelected(step.id, option.value)
                        ? "bg-white border-[#064e3b] shadow-xl shadow-[#064e3b]/5"
                        : "bg-white/50 border-stone-200 hover:border-stone-300 hover:bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-4">
                      <span className="text-3xl">{option.icon}</span>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected(step.id, option.value)
                          ? "bg-[#064e3b] border-[#064e3b]"
                          : "border-stone-200"
                      )}>
                        {isSelected(step.id, option.value) && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                    <h3 className={cn(
                      "text-xl font-bold mb-1 transition-colors",
                      isSelected(step.id, option.value) ? "text-[#064e3b]" : "text-stone-800"
                    )}>
                      {option.label}
                    </h3>
                    {option.detail && (
                      <p className="text-stone-500 text-sm leading-relaxed">
                        {option.detail}
                      </p>
                    )}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation - Fixed at bottom of container */}
        <div className="flex items-center justify-between pt-8 pb-4 border-t border-stone-200 bg-[#f5f5f0]/80 backdrop-blur-sm mt-auto">
          <div className="flex gap-2">
            {STEPS.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  idx === currentStep ? "w-8 bg-[#064e3b]" : (idx < currentStep ? "w-4 bg-[#064e3b]/30" : "w-4 bg-stone-200")
                )}
              />
            ))}
          </div>

          <div className="flex gap-4">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="h-12 px-6 rounded-2xl text-stone-500 hover:text-stone-800"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                返回
              </Button>
            )}
            <Button
              disabled={!canContinue}
              onClick={handleNext}
              className={cn(
                "h-12 px-8 rounded-2xl text-base font-bold shadow-lg transition-all",
                canContinue 
                  ? "bg-[#064e3b] hover:bg-[#043d2e] text-white shadow-[#064e3b]/20" 
                  : "bg-stone-200 text-stone-400"
              )}
            >
              {isLastStep ? '开启深度阅读' : '继续'}
              {!isLastStep && <ChevronRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
