/**
 * SortableChipGrid
 *
 * Grid de chips com layout flexWrap natural (não colunas fixas) e drag-and-drop.
 * Usa react-native-gesture-handler + react-native-reanimated (já instalados).
 *
 * - Tap rápido (< 280ms) → seleciona o item (chama onSelect)
 * - Segure > 300ms       → ativa arrasto; chip "flutua" seguindo o dedo
 * - Soltar               → reposiciona; chama onOrderChange
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';

export interface SortableChipItem {
  id: string;
  name: string;
}

// ─── Sub-componente de cada chip ─────────────────────────────────────────────

interface ChipProps {
  item: SortableChipItem;
  isSelected: boolean;
  isActive: boolean;
  isHovered: boolean;
  accentColor: string;
  borderColor: string;
  textColor: string;
  radiusMd: number;
  overlayX: SharedValue<number>;
  overlayY: SharedValue<number>;
  initX: SharedValue<number>;
  initY: SharedValue<number>;
  onSelect: (id: string) => void;
  onStartDrag: (id: string) => void;
  onUpdateHover: (absX: number, absY: number) => void;
  onEndDrag: (absX: number, absY: number) => void;
  onChipLayout: (l: { x: number; y: number; width: number; height: number }) => void;
}

function ChipItem({
  item,
  isSelected,
  isActive,
  isHovered,
  accentColor,
  borderColor,
  textColor,
  radiusMd,
  overlayX,
  overlayY,
  initX,
  initY,
  onSelect,
  onStartDrag,
  onUpdateHover,
  onEndDrag,
  onChipLayout,
}: ChipProps) {
  const chipScale = useSharedValue(1);

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chipScale.value }],
  }));

  // Tap rápido → seleciona
  const tapGesture = Gesture.Tap()
    .maxDuration(280)
    .onBegin(() => {
      'worklet';
      chipScale.value = withSpring(0.92, { damping: 15 });
    })
    .onEnd((_e, success) => {
      'worklet';
      chipScale.value = withSpring(1, { damping: 15 });
      if (success) runOnJS(onSelect)(item.id);
    })
    .onFinalize(() => {
      'worklet';
      chipScale.value = withSpring(1, { damping: 15 });
    });

  // Long-press + pan → arrasta
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(300)
    .onStart(() => {
      'worklet';
      runOnJS(onStartDrag)(item.id);
    })
    .onUpdate((e) => {
      'worklet';
      overlayX.value = initX.value + e.translationX;
      overlayY.value = initY.value + e.translationY;
      runOnJS(onUpdateHover)(e.absoluteX, e.absoluteY);
    })
    .onFinalize((e) => {
      'worklet';
      runOnJS(onEndDrag)(e.absoluteX, e.absoluteY);
    });

  const gesture = Gesture.Race(tapGesture, dragGesture);

  const bgColor = isSelected ? accentColor : isHovered ? accentColor + '28' : 'transparent';
  const bdrColor = isActive || isSelected ? accentColor : isHovered ? accentColor : borderColor;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(e) => onChipLayout(e.nativeEvent.layout)}
        style={[
          styles.chip,
          {
            backgroundColor: bgColor,
            borderColor: bdrColor,
            borderRadius: radiusMd,
            opacity: isActive ? 0.22 : 1,
          },
          chipAnimStyle,
        ]}
      >
        <Text
          style={[styles.chipText, { color: isSelected ? '#fff' : textColor }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── SortableChipGrid (componente público) ───────────────────────────────────

interface SortableChipGridProps {
  items: SortableChipItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOrderChange: (newItems: SortableChipItem[]) => void;
  accentColor: string;
  borderColor: string;
  textColor: string;
  radiusMd: number;
}

export function SortableChipGrid({
  items: initialItems,
  selectedId,
  onSelect,
  onOrderChange,
  accentColor,
  borderColor,
  textColor,
  radiusMd,
}: SortableChipGridProps) {
  // ─ Estado interno ──────────────────────────────────────────────────────────
  const [items, setItems] = useState<SortableChipItem[]>(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<SortableChipItem | null>(null);

  // ─ Refs (evitam closures obsoletas nos callbacks) ──────────────────────────
  const activeIdRef = useRef<string | null>(null);
  const itemLayouts = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const containerRef = useRef<View>(null);
  const containerPage = useRef({ x: 0, y: 0 });
  // itemsRef sempre em sincronia — pode ser lido nos callbacks sem problema
  const itemsRef = useRef<SortableChipItem[]>(items);
  itemsRef.current = items;

  /**
   * Sincroniza quando o pai carrega os dados de forma assíncrona.
   * O useState(initialItems) só usa o valor no primeiro render; depois,
   * precisamos atualizar via useEffect quando os dados chegam.
   */
  useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems);
      // NÃO toca itemsRef.current diretamente: a linha `itemsRef.current = items`
      // acima já mantém em sincronia após o setState.
    }
  }, [initialItems]);

  // ─ Shared values para o overlay (UI thread → 60fps) ───────────────────────
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);
  const initX = useSharedValue(0);
  const initY = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const overlayScale = useSharedValue(1);

  const overlayAnimStyle = useAnimatedStyle(() => ({
    left: overlayX.value,
    top: overlayY.value,
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  // ─ Callbacks JS (chamados via runOnJS) ─────────────────────────────────────

  const startDrag = useCallback((id: string) => {
    const layout = itemLayouts.current[id];
    if (!layout) return;

    containerRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      containerPage.current = { x: pageX, y: pageY };
    });

    initX.value = layout.x;
    initY.value = layout.y;
    overlayX.value = layout.x;
    overlayY.value = layout.y;
    overlayOpacity.value = withSpring(1, { damping: 20 });
    overlayScale.value = withSpring(1.08, { damping: 12 });

    activeIdRef.current = id;
    setActiveId(id);
    setDraggingItem(itemsRef.current.find((i) => i.id === id) ?? null);
  }, []);

  const updateHover = useCallback((absX: number, absY: number) => {
    const relX = absX - containerPage.current.x;
    const relY = absY - containerPage.current.y;
    let hovered: string | null = null;
    for (const [id, l] of Object.entries(itemLayouts.current)) {
      if (id === activeIdRef.current) continue;
      if (relX >= l.x && relX <= l.x + l.width && relY >= l.y && relY <= l.y + l.height) {
        hovered = id;
        break;
      }
    }
    setHoverTargetId(hovered);
  }, []);

  const endDrag = useCallback((absX: number, absY: number) => {
    const srcId = activeIdRef.current;

    overlayOpacity.value = withSpring(0, { damping: 20 }, (finished) => {
      if (finished) runOnJS(setDraggingItem)(null);
    });
    overlayScale.value = withSpring(1, { damping: 20 });
    setActiveId(null);
    setHoverTargetId(null);
    activeIdRef.current = null;

    if (!srcId) return;

    const relX = absX - containerPage.current.x;
    const relY = absY - containerPage.current.y;

    // 1ª tentativa: solto dentro dos limites de um chip
    let targetId: string | null = null;
    for (const [id, l] of Object.entries(itemLayouts.current)) {
      if (id === srcId) continue;
      if (relX >= l.x && relX <= l.x + l.width && relY >= l.y && relY <= l.y + l.height) {
        targetId = id;
        break;
      }
    }

    // Fallback: chip com centro mais próximo
    if (!targetId) {
      let minDist = Infinity;
      for (const [id, l] of Object.entries(itemLayouts.current)) {
        if (id === srcId) continue;
        const cx = l.x + l.width / 2;
        const cy = l.y + l.height / 2;
        const dist = Math.sqrt((relX - cx) ** 2 + (relY - cy) ** 2);
        if (dist < minDist) { minDist = dist; targetId = id; }
      }
    }

    if (!targetId) return;

    const cur = itemsRef.current;
    const srcIdx = cur.findIndex((i) => i.id === srcId);
    const tgtIdx = cur.findIndex((i) => i.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;

    // Determina se insere antes ou depois do alvo com base no ponto de soltura
    const tgtL = itemLayouts.current[targetId];
    const tgtCX = tgtL.x + tgtL.width / 2;
    const tgtCY = tgtL.y + tgtL.height / 2;
    const insertAfter =
      Math.abs(relY - tgtCY) > tgtL.height / 2
        ? relY > tgtCY   // linhas diferentes: usa eixo Y
        : relX > tgtCX;  // mesma linha: usa eixo X

    let insertIdx = insertAfter ? tgtIdx + 1 : tgtIdx;
    // Ajusta porque a remoção de srcIdx desloca os índices seguintes
    if (srcIdx < insertIdx) insertIdx--;
    insertIdx = Math.max(0, Math.min(insertIdx, cur.length - 1));

    if (srcIdx === insertIdx) return;

    const newItems = [...cur];
    const [removed] = newItems.splice(srcIdx, 1);
    newItems.splice(insertIdx, 0, removed);
    setItems(newItems);
    onOrderChange(newItems);
  }, [onOrderChange]);

  // ─ Render ──────────────────────────────────────────────────────────────────

  return (
    <View
      ref={containerRef}
      onLayout={() => {
        containerRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
          containerPage.current = { x: pageX, y: pageY };
        });
      }}
      style={styles.container}
    >
      {items.map((item) => (
        <ChipItem
          key={item.id}
          item={item}
          isSelected={selectedId === item.id}
          isActive={activeId === item.id}
          isHovered={hoverTargetId === item.id}
          accentColor={accentColor}
          borderColor={borderColor}
          textColor={textColor}
          radiusMd={radiusMd}
          overlayX={overlayX}
          overlayY={overlayY}
          initX={initX}
          initY={initY}
          onSelect={onSelect}
          onStartDrag={startDrag}
          onUpdateHover={updateHover}
          onEndDrag={endDrag}
          onChipLayout={(l) => { itemLayouts.current[item.id] = l; }}
        />
      ))}

      {/* Cópia flutuante durante o arrasto */}
      {draggingItem && (
        <Animated.View
          style={[
            styles.chip,
            styles.overlay,
            overlayAnimStyle,
            {
              borderRadius: radiusMd,
              borderColor: accentColor,
              backgroundColor: accentColor + '28',
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.chipText, { color: accentColor }]} numberOfLines={1}>
            {draggingItem.name}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontWeight: '600',
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
});
