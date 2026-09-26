import React from 'react';

export const VintagePencilClouds: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Upper Left Cloud (Pencil sketch cross-hatch style) */}
      <svg
        className="absolute top-28 -left-6 md:left-8 w-48 md:w-72 h-auto opacity-45"
        viewBox="0 0 280 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M30,85 C20,85 10,75 12,62 C14,50 25,45 35,46 C40,32 55,22 72,24 C85,25 95,33 100,42 C108,36 122,38 128,48 C138,45 152,50 156,60 C168,62 175,72 172,82 C170,88 162,92 155,92 Z"
          fill="#ECE2D0"
          stroke="#94806A"
          strokeWidth="1.25"
          strokeDasharray="4 2"
        />
        {/* Soft internal cloud contour lines */}
        <path d="M45,70 C60,60 85,62 95,72" stroke="#B8A48F" strokeWidth="1" strokeLinecap="round" />
        <path d="M70,55 C90,45 120,48 135,62" stroke="#B8A48F" strokeWidth="1" strokeLinecap="round" />
        <path d="M120,68 C135,60 155,64 162,75" stroke="#B8A48F" strokeWidth="1" strokeLinecap="round" />
        {/* Etched shading lines under the cloud */}
        <line x1="40" y1="88" x2="60" y2="88" stroke="#A89480" strokeWidth="0.8" />
        <line x1="75" y1="89" x2="115" y2="89" stroke="#A89480" strokeWidth="0.8" />
        <line x1="130" y1="90" x2="160" y2="90" stroke="#A89480" strokeWidth="0.8" />
      </svg>

      {/* Upper Right Cloud */}
      <svg
        className="absolute top-20 right-2 md:right-12 w-56 md:w-80 h-auto opacity-45"
        viewBox="0 0 320 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M50,90 C35,90 25,78 28,65 C30,52 42,46 55,47 C62,30 82,20 102,22 C118,24 130,34 136,45 C146,38 162,40 170,52 C182,48 198,54 204,66 C218,68 226,80 222,92 C220,96 210,100 200,100 Z"
          fill="#EDE4D4"
          stroke="#94806A"
          strokeWidth="1.25"
          strokeDasharray="4 2"
        />
        <path d="M65,72 C85,62 115,64 128,75" stroke="#B8A48F" strokeWidth="1" strokeLinecap="round" />
        <path d="M100,52 C125,40 160,44 180,60" stroke="#B8A48F" strokeWidth="1" strokeLinecap="round" />
        <path d="M165,70 C185,62 205,66 215,78" stroke="#B8A48F" strokeWidth="1" strokeLinecap="round" />
        <line x1="60" y1="95" x2="90" y2="95" stroke="#A89480" strokeWidth="0.8" />
        <line x1="110" y1="96" x2="160" y2="96" stroke="#A89480" strokeWidth="0.8" />
      </svg>
    </div>
  );
};
