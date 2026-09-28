import React, { 
  Children, 
  isValidElement, 
  useEffect, 
  useRef, 
  useState, 
  useCallback 
} from 'react';
import gsap from 'gsap';

export interface CardSwapProps {
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  skewAmount?: number;
  easing?: 'elastic' | 'power' | 'back' | string;
  children: React.ReactNode;
  className?: string;
  initialIndex?: number;
  onCardChange?: (index: number) => void;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, style }) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`w-full h-full rounded-2xl select-none flex flex-col justify-between ${className}`}
    >
      {children}
    </div>
  );
};

export const CardSwap: React.FC<CardSwapProps> = ({
  width = 340,
  height = 480,
  cardDistance = 45,
  verticalDistance = 55,
  delay = 4000,
  pauseOnHover = true,
  skewAmount = 4,
  easing = 'elastic',
  children,
  className = '',
  initialIndex = 0,
  onCardChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isAnimating = useRef(false);
  const isHovered = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const childArray = Children.toArray(children).filter(isValidElement);
  const totalCards = childArray.length;

  // Track the current visual slot order of card indices starting from initialIndex
  const orderRef = useRef<number[]>(
    childArray.map((_, i) => (i + initialIndex) % Math.max(1, childArray.length))
  );
  const [activeFrontIndex, setActiveFrontIndex] = useState(
    totalCards > 0 ? initialIndex % totalCards : 0
  );

  // Determine GSAP easing formula
  const getEase = useCallback(() => {
    switch (easing) {
      case 'elastic':
        return 'elastic.out(1, 0.75)';
      case 'power':
        return 'power2.out';
      case 'back':
        return 'back.out(1.4)';
      default:
        return easing;
    }
  }, [easing]);

  // Position a card into its respective slot
  const getSlotStyles = useCallback((slotIndex: number, total: number) => {
    const isFront = slotIndex === 0;
    return {
      x: slotIndex * cardDistance,
      y: -slotIndex * verticalDistance,
      rotation: slotIndex * (skewAmount / 2),
      scale: 1 - slotIndex * 0.05,
      opacity: isFront ? 1 : Math.max(0.65, 1 - slotIndex * 0.12),
      zIndex: total - slotIndex,
    };
  }, [cardDistance, verticalDistance, skewAmount]);

  // Initialize initial card positions
  const initCards = useCallback(() => {
    if (!cardRefs.current.length) return;
    const total = cardRefs.current.length;
    orderRef.current.forEach((cardIdx, slotIdx) => {
      const el = cardRefs.current[cardIdx];
      if (el) {
        const styles = getSlotStyles(slotIdx, total);
        gsap.set(el, {
          x: styles.x,
          y: styles.y,
          rotation: styles.rotation,
          scale: styles.scale,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          transformOrigin: 'bottom center',
        });
      }
    });
  }, [getSlotStyles]);

  // Perform card swap
  const swap = useCallback(() => {
    if (isAnimating.current || totalCards < 2) return;
    isAnimating.current = true;

    const currentOrder = [...orderRef.current];
    const frontCardIdx = currentOrder[0];
    const frontEl = cardRefs.current[frontCardIdx];
    if (!frontEl) {
      isAnimating.current = false;
      return;
    }

    const nextOrder = [...currentOrder.slice(1), frontCardIdx];
    const ease = getEase();
    const tl = gsap.timeline({
      onComplete: () => {
        orderRef.current = nextOrder;
        setActiveFrontIndex(nextOrder[0]);
        if (onCardChange) {
          onCardChange(nextOrder[0]);
        }
        isAnimating.current = false;
      },
    });

    // 1. Move front card out to the left & slightly down
    tl.to(frontEl, {
      x: -cardDistance * 1.8,
      y: 20,
      rotation: -skewAmount * 2,
      scale: 0.96,
      opacity: 0.8,
      duration: 0.4,
      ease: 'power2.inOut',
    })
    // 2. Drop its zIndex to the lowest so it slides behind the stack
    .set(frontEl, {
      zIndex: 1,
    })
    // 3. Move front card into the back slot
    .to(frontEl, {
      ...getSlotStyles(totalCards - 1, totalCards),
      zIndex: 1,
      duration: 0.65,
      ease,
    }, '-=0.15');

    // 4. Shift all other cards forward simultaneously
    for (let i = 1; i < totalCards; i++) {
      const cardIdx = currentOrder[i];
      const el = cardRefs.current[cardIdx];
      if (el) {
        const targetSlot = i - 1;
        const targetStyles = getSlotStyles(targetSlot, totalCards);
        tl.to(el, {
          x: targetStyles.x,
          y: targetStyles.y,
          rotation: targetStyles.rotation,
          scale: targetStyles.scale,
          opacity: targetStyles.opacity,
          zIndex: targetStyles.zIndex,
          duration: 0.65,
          ease,
        }, '<');
      }
    }
  }, [totalCards, cardDistance, skewAmount, getEase, getSlotStyles, onCardChange]);

  // Jump to specific card index if clicked
  const bringToFront = useCallback((targetCardIdx: number) => {
    if (isAnimating.current || orderRef.current[0] === targetCardIdx) return;
    swap();
  }, [swap]);

  // Setup auto-advance interval
  useEffect(() => {
    initCards();

    if (delay <= 0 || totalCards < 2) return;

    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!isHovered.current) {
          swap();
        }
      }, delay);
    };

    startTimer();

    const cardsToClean = cardRefs.current;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cardsToClean.forEach((el) => {
        if (el) gsap.killTweensOf(el);
      });
    };
  }, [delay, totalCards, initCards, swap]);

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      isHovered.current = true;
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      isHovered.current = false;
    }
  };

  if (totalCards === 0) return null;

  // Responsive padding calculation: stack spreads right by (totalCards - 1) * cardDistance
  // and up by (totalCards - 1) * verticalDistance
  const stackExtraWidth = (totalCards - 1) * cardDistance;
  const stackExtraHeight = (totalCards - 1) * verticalDistance;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-active-index={activeFrontIndex}
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{
        width: `${width + stackExtraWidth}px`,
        height: `${height + stackExtraHeight}px`,
        maxWidth: '100%',
      }}
      aria-label="Interactive Card Stack"
    >
      {/* Anchor container for absolute positioned cards */}
      <div
        className="relative"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          marginTop: `${stackExtraHeight}px`,
          marginRight: `${stackExtraWidth}px`,
        }}
      >
        {childArray.map((child, idx) => (
          <div
            key={idx}
            ref={(el) => {
              cardRefs.current[idx] = el;
            }}
            onClick={() => bringToFront(idx)}
            className="absolute top-0 left-0 will-change-transform cursor-pointer transition-shadow"
            style={{
              width: `${width}px`,
              height: `${height}px`,
            }}
            role="button"
            tabIndex={0}
            aria-label={`Stage card ${idx + 1}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                bringToFront(idx);
              }
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};
