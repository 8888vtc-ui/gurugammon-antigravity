import React from 'react';
import { motion } from 'framer-motion';
import type { PlayerColor } from '@/types/game';

interface CheckerProps {
  color: PlayerColor;
  isSelected: boolean;
  onClick?: () => void;
}

const Checker: React.FC<CheckerProps> = ({ color, isSelected, onClick }) => {
  const bgColor = color === 'white' ? 'bg-white' : 'bg-red-800';
  const border = isSelected ? 'border-4 border-blue-500' : 'border-2 border-gray-800';

  return (
    <motion.div
      initial={{ scale: 0.5 }}
      animate={{ scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 700,
        damping: 30
      }}
      className={`w-8 h-8 rounded-full ${bgColor} ${border} cursor-pointer`}
      onClick={onClick}
    />
  );
};

export default Checker;
