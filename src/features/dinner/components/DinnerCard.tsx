import React from 'react';
import { DinnerResponseDto } from '../../../types/api';

interface Props {
  dinner: DinnerResponseDto;
  onClick: () => void;
}

export const DinnerCard: React.FC<Props> = ({ dinner, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden border border-gray-100"
    >
      {/* 이미지 영역 */}
      <div className="h-40 bg-gray-200 w-full flex items-center justify-center">
        {dinner.imageUrl ? (
          <img
            src={dinner.imageUrl}
            alt={dinner.dinnerName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-400 text-4xl">🍽️</span>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900">{dinner.dinnerName}</h3>
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            ₩{dinner.basePrice.toLocaleString()}~
          </span>
        </div>
        <p className="text-gray-600 text-sm line-clamp-2 h-10">
          {dinner.description}
        </p>
      </div>
    </div>
  );
};
