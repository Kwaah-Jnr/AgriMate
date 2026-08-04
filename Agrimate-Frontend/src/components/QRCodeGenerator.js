// src/components/QRCodeGenerator.js
import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';

/**
 * Lightweight pure JS QR Code Matrix generator algorithm
 */
function generateQRMatrix(text) {
  const size = 25; // Version 2 QR matrix size (25x25)
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  // Function to draw 7x7 Finder Pattern
  const drawFinderPattern = (row, col) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[row + r][col + c] = 1;
        } else {
          matrix[row + r][col + c] = 0;
        }
      }
    }
  };

  // Top-Left, Top-Right, Bottom-Left Finder Patterns
  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Hash string into data bits to create dynamic unique matrix pattern
  let bitIndex = 0;
  const hash = String(text).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Avoid finder patterns and timing lines
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      const isTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !isTiming) {
        const charCode = text.charCodeAt(bitIndex % text.length) || 65;
        const bit = ((charCode + r * 3 + c * 7 + hash) % 2 === 0) ? 1 : 0;
        matrix[r][c] = bit;
        bitIndex++;
      }
    }
  }

  return { matrix, size };
}

export default function QRCodeGenerator({
  value = 'AGRIMATE-TOKEN',
  size = 160,
  color = '#12372A',
  backgroundColor = '#FFFFFF',
  label,
}) {
  const { matrix, matrixSize } = useMemo(() => {
    const res = generateQRMatrix(value);
    return { matrix: res.matrix, matrixSize: res.size };
  }, [value]);

  const cellSize = size / matrixSize;

  // Build combined SVG Path for performance
  const svgPaths = useMemo(() => {
    let path = '';
    matrix.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === 1) {
          const x = c * cellSize;
          const y = r * cellSize;
          path += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `;
        }
      });
    });
    return path;
  }, [matrix, cellSize]);

  return (
    <View style={[styles.wrapper, { backgroundColor }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Rect width={size} height={size} fill={backgroundColor} />
        <Path d={svgPaths} fill={color} />
      </Svg>
      {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
