import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { StatKey, ALL_STAT_KEYS } from '../engine/types';
import { STAT_COLORS, COLORS, STAT_FULL_LABELS } from '../theme';

interface Props {
  stats: Record<StatKey, { level: number }>;
  size?: number;
}

const STAT_ORDER: StatKey[] = ALL_STAT_KEYS;

const MAX_LEVEL = 50;

export const RadarChart: React.FC<Props> = ({ stats, size = 280 }) => {
  const padding = 48;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - padding * 2) * 0.38;
  const labelRadius = (size - padding * 2) * 0.52 + padding * 0.5;
  const n = STAT_ORDER.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const point = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const statPoints = STAT_ORDER.map((key, i) => {
    const level = stats[key]?.level ?? 1;
    const ratio = Math.min(level / MAX_LEVEL, 1);
    const minRatio = 0.05;
    const r = radius * (minRatio + ratio * (1 - minRatio));
    return point(i, r);
  });

  const polygonPoints = statPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={size} height={size}>
        {/* Сетка */}
        {gridLevels.map((ratio, gi) => {
          const pts = Array.from({ length: n }, (_, i) => {
            const p = point(i, radius * ratio);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <Polygon
              key={gi}
              points={pts}
              fill="none"
              stroke={COLORS.cardBorder}
              strokeWidth={1}
            />
          );
        })}

        {/* Лучи */}
        {STAT_ORDER.map((_, i) => {
          const p = point(i, radius);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={COLORS.cardBorder}
              strokeWidth={1}
            />
          );
        })}

        {/* Заливка персонажа */}
        <Polygon
          points={polygonPoints}
          fill={`${COLORS.accent}30`}
          stroke={COLORS.accent}
          strokeWidth={2}
        />

        {/* Точки на вершинах */}
        {statPoints.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={STAT_COLORS[STAT_ORDER[i]]}
          />
        ))}

        {/* Лейблы */}
        {STAT_ORDER.map((key, i) => {
          const lp = point(i, labelRadius);
          const label = STAT_FULL_LABELS[key];
          const words = label.split(' ');
          return words.length > 1 ? (
            <SvgText key={key} textAnchor="middle" fill={STAT_COLORS[key]}>
              {words.map((word, wi) => (
                <SvgText
                  key={wi}
                  x={lp.x}
                  y={lp.y + (wi - (words.length - 1) / 2) * 11}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="bold"
                  fill={STAT_COLORS[key]}
                >
                  {word}
                </SvgText>
              ))}
            </SvgText>
          ) : (
            <SvgText
              key={key}
              x={lp.x}
              y={lp.y + 4}
              textAnchor="middle"
              fontSize={9}
              fontWeight="bold"
              fill={STAT_COLORS[key]}
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};
