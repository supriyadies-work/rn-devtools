import React, { useCallback, useEffect, useMemo } from "react";
import { Image, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { FabPosition } from "../core/types";
import { colors } from "./theme";

const FAB_SIZE = 48;
const DRAG_MIN_DISTANCE = 12;
const DEVTOOLS_ICON = require("../dev.png") as number;

type DevToolsFabProps = {
  onPress: () => void;
  initialPosition?: FabPosition;
  onPositionChange?: (position: FabPosition) => void;
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const clampWorklet = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(Math.max(value, min), max);
};

export const DevToolsFab = ({
  onPress,
  initialPosition,
  onPositionChange,
}: DevToolsFabProps) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const minX = insets.left + 8;
  const maxX = Math.max(minX, width - FAB_SIZE - insets.right - 8);
  const minY = insets.top + 8;
  const maxY = Math.max(minY, height - FAB_SIZE - insets.bottom - 8);

  const defaultX = maxX;
  const defaultY = Math.max(minY, maxY - 80);

  const translateX = useSharedValue(initialPosition?.x ?? defaultX);
  const translateY = useSharedValue(initialPosition?.y ?? defaultY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const bounds = useSharedValue<Bounds>({ minX, maxX, minY, maxY });

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const handlePositionChange = useCallback(
    (x: number, y: number) => {
      onPositionChange?.({ x, y });
    },
    [onPositionChange],
  );

  useEffect(() => {
    bounds.value = { minX, maxX, minY, maxY };

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    translateX.value = clamp(
      initialPosition?.x ?? translateX.value,
      minX,
      maxX,
    );
    translateY.value = clamp(
      initialPosition?.y ?? translateY.value,
      minY,
      maxY,
    );
  }, [
    bounds,
    initialPosition,
    maxX,
    maxY,
    minX,
    minY,
    translateX,
    translateY,
  ]);

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => {
        "worklet";
        runOnJS(handlePress)();
      });

    const pan = Gesture.Pan()
      .minDistance(DRAG_MIN_DISTANCE)
      .onBegin(() => {
        "worklet";
        startX.value = translateX.value;
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        "worklet";
        const b = bounds.value;
        translateX.value = clampWorklet(
          startX.value + event.translationX,
          b.minX,
          b.maxX,
        );
        translateY.value = clampWorklet(
          startY.value + event.translationY,
          b.minY,
          b.maxY,
        );
      })
      .onEnd(() => {
        "worklet";
        runOnJS(handlePositionChange)(translateX.value, translateY.value);
      });

    return Gesture.Race(tap, pan);
  }, [
    bounds,
    handlePositionChange,
    handlePress,
    startX,
    startY,
    translateX,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityLabel="Open Supr Devtools"
        accessibilityRole="button"
        style={[styles.fab, animatedStyle]}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={DEVTOOLS_ICON}
          style={styles.icon}
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    top: 0,
    left: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  icon: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
  },
});
