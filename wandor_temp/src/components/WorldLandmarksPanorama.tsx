import React, { useState } from 'react';

interface WorldLandmarksPanoramaProps {
  onSelectLandmark?: (landmarkName: string, promptSuggestion: string) => void;
}

export const WorldLandmarksPanorama: React.FC<WorldLandmarksPanoramaProps> = ({ onSelectLandmark }) => {
  const [hoveredLandmark, setHoveredLandmark] = useState<string | null>(null);

  const landmarks = [
    {
      id: 'petra',
      name: 'Petra & Jordan Desert',
      prompt: "A 6-day journey through Petra, Wadi Rum red desert, and the Dead Sea with Bedouin campfire dinners and hidden canyon trails."
    },
    {
      id: 'colosseum',
      name: 'Rome & The Eternal City',
      prompt: "A 5-day escape in Rome exploring hidden trattorias in Trastevere, early morning Colosseum walks, and scenic Gianicolo hill sunsets."
    },
    {
      id: 'chichenitza',
      name: 'Chichén Itzá & Yucatán',
      prompt: "A 7-day road trip through Yucatán visiting hidden jungle cenotes, ancient Mayan ruins at sunrise, and colonial Valladolid."
    },
    {
      id: 'tajmahal',
      name: 'Agra & Taj Mahal at Dawn',
      prompt: "A 4-day cultural exploration in Agra and Rajasthan with sunrise views of the Taj Mahal from Mehtab Bagh and artisan marble workshops."
    },
    {
      id: 'christ',
      name: 'Rio de Janeiro & Coastal Peaks',
      prompt: "A 6-day vibrant adventure in Rio de Janeiro hiking Morro Dois Irmãos, sunrise at Christ the Redeemer, and sunset bossa nova in Ipanema."
    }
  ];

  const handleLandmarkClick = (id: string) => {
    const item = landmarks.find(l => l.id === id);
    if (item && onSelectLandmark) {
      onSelectLandmark(item.name, item.prompt);
    }
  };

  return (
    <div className="relative w-full overflow-hidden select-none pointer-events-auto">
      {/* Active Landmark Hover Badge */}
      {hoveredLandmark && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-200">
          <div className="px-3.5 py-1.5 rounded-full bg-[#18181B] text-[#FAF6F0] text-xs font-medium tracking-wide shadow-lg flex items-center gap-1.5 border border-stone-700">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>{landmarks.find(l => l.id === hoveredLandmark)?.name} — click to plan trip</span>
          </div>
        </div>
      )}

      {/* Panorama SVG matching the reference artwork */}
      <svg
        viewBox="0 0 1440 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[460px] object-cover object-bottom"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          {/* Paper and rock textures */}
          <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#4A2810" strokeWidth="1" strokeOpacity="0.25" />
          </pattern>
          <pattern id="fineHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#2B1A0E" strokeWidth="0.75" strokeOpacity="0.3" />
          </pattern>
          <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F6F1EA" stopOpacity="0" />
            <stop offset="60%" stopColor="#EFE5D6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#E8DAC6" stopOpacity="0.9" />
          </linearGradient>

          {/* Color Gradients for Mountains & Earth */}
          <linearGradient id="terracottaRock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C47348" />
            <stop offset="100%" stopColor="#964928" />
          </linearGradient>
          <linearGradient id="warmSand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D9B78F" />
            <stop offset="100%" stopColor="#B38758" />
          </linearGradient>
          <linearGradient id="oliveHills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C704E" />
            <stop offset="100%" stopColor="#4A4F32" />
          </linearGradient>
          <linearGradient id="marbleIvory" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F8F3EA" />
            <stop offset="100%" stopColor="#D9CEBC" />
          </linearGradient>
          <linearGradient id="darkMountain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#57493A" />
            <stop offset="100%" stopColor="#382C22" />
          </linearGradient>
        </defs>

        {/* Soft Background Sky Horizon Layer */}
        <path d="M0,280 Q360,240 720,260 T1440,250 L1440,400 L0,400 Z" fill="url(#skyFade)" />

        {/* Distant Hills & Soft Mountain Ridge Behind Center */}
        <g id="distant-hills" opacity="0.85">
          <path d="M580,290 C620,180 720,150 780,240 C840,190 920,220 960,320 L580,350 Z" fill="#655D4E" />
          <path d="M720,240 C760,160 840,150 890,260 L720,280 Z" fill="#4D4638" />
          {/* Cross hatch on distant mountain */}
          <path d="M720,240 C760,160 840,150 890,260 L720,280 Z" fill="url(#fineHatch)" />
        </g>

        {/* ========================================================================= */}
        {/* LANDMARK 1: PETRA & SANDSTONE CITADEL (Far Left, X: 0 to 320)             */}
        {/* ========================================================================= */}
        <g
          id="landmark-petra"
          className="cursor-pointer transition-opacity hover:opacity-95"
          onMouseEnter={() => setHoveredLandmark('petra')}
          onMouseLeave={() => setHoveredLandmark(null)}
          onClick={() => handleLandmarkClick('petra')}
        >
          {/* High Sandstone Cliff Mountain on far left */}
          <path d="M-20,400 L0,220 L30,170 L55,175 L80,185 L90,195 L140,230 L220,260 L280,310 L300,400 Z" fill="url(#terracottaRock)" />
          
          {/* Carved Mountain Facade / Petra Towers */}
          <path d="M35,175 L75,175 L75,190 L90,190 L90,270 L30,270 Z" fill="#A85732" stroke="#3D1D0F" strokeWidth="2" />
          {/* Petra Citadel Tower Battlements */}
          <rect x="40" y="165" width="10" height="12" fill="#883E1E" stroke="#3D1D0F" strokeWidth="1.5" />
          <rect x="55" y="165" width="10" height="12" fill="#883E1E" stroke="#3D1D0F" strokeWidth="1.5" />
          <rect x="70" y="165" width="10" height="12" fill="#883E1E" stroke="#3D1D0F" strokeWidth="1.5" />
          
          {/* Petra Rock Windows & Carvings */}
          <rect x="48" y="195" width="8" height="14" rx="3" fill="#2E1408" />
          <rect x="65" y="195" width="8" height="14" rx="3" fill="#2E1408" />
          <rect x="48" y="225" width="10" height="18" rx="4" fill="#2E1408" />
          <rect x="68" y="225" width="10" height="18" rx="4" fill="#2E1408" />
          <rect x="88" y="225" width="8" height="14" rx="3" fill="#2E1408" />
          
          {/* Main Classical Portico Columns (Petra Treasury Arch) */}
          <path d="M75,260 L195,260 L185,395 L65,395 Z" fill="#B35F38" stroke="#3D1D0F" strokeWidth="2.5" />
          <path d="M75,260 L135,225 L195,260 Z" fill="#C97349" stroke="#3D1D0F" strokeWidth="2.5" />
          
          {/* Arch Pediment carving */}
          <path d="M95,260 L135,238 L175,260 Z" fill="#833C1A" stroke="#3D1D0F" strokeWidth="1.5" />
          {/* Treasury Doorway Arch */}
          <path d="M115,300 C115,285 155,285 155,300 L155,370 L115,370 Z" fill="#240F06" stroke="#3D1D0F" strokeWidth="2" />
          {/* Decorative Treasury Columns */}
          <line x1="88" y1="260" x2="88" y2="370" stroke="#3D1D0F" strokeWidth="2.5" />
          <line x1="102" y1="260" x2="102" y2="370" stroke="#3D1D0F" strokeWidth="2" />
          <line x1="168" y1="260" x2="168" y2="370" stroke="#3D1D0F" strokeWidth="2" />
          <line x1="182" y1="260" x2="182" y2="370" stroke="#3D1D0F" strokeWidth="2.5" />

          {/* Hatching & Texture for Petra */}
          <path d="M0,220 L40,175 L80,185 L140,230 L220,260 L185,395 L0,400 Z" fill="url(#hatch)" opacity="0.4" />

          {/* Stepped Rocks & Slopes */}
          <path d="M12,270 L45,285 L50,330 L10,340 Z" fill="#884120" stroke="#3D1D0F" strokeWidth="1.5" />
          <path d="M0,320 L70,350 L55,400 L0,400 Z" fill="#693016" stroke="#3D1D0F" strokeWidth="2" />

          {/* Olive trees and foliage around Petra base */}
          <circle cx="50" cy="370" r="14" fill="#545B3E" stroke="#252B19" strokeWidth="1.5" />
          <circle cx="68" cy="380" r="16" fill="#3D452C" stroke="#252B19" strokeWidth="1.5" />
          <circle cx="30" cy="385" r="12" fill="#646C49" stroke="#252B19" strokeWidth="1.5" />
        </g>

        {/* ========================================================================= */}
        {/* LANDMARK 2: THE COLOSSEUM OF ROME (Center Left, X: 240 to 480)           */}
        {/* ========================================================================= */}
        <g
          id="landmark-colosseum"
          className="cursor-pointer transition-opacity hover:opacity-95"
          onMouseEnter={() => setHoveredLandmark('colosseum')}
          onMouseLeave={() => setHoveredLandmark(null)}
          onClick={() => handleLandmarkClick('colosseum')}
        >
          {/* Main Oval Colosseum Wall */}
          <path
            d="M230,305 C240,245 340,240 440,270 L445,360 C380,375 290,370 230,340 Z"
            fill="#C97A53"
            stroke="#3A1D0E"
            strokeWidth="2.5"
          />

          {/* Stepped outer broken Roman ruin facade */}
          <path
            d="M235,300 L245,248 L285,248 L285,260 L330,260 L330,272 L380,272 L380,285 L435,285 L440,360 L235,300 Z"
            fill="#B86842"
            stroke="#3A1D0E"
            strokeWidth="2.5"
          />

          {/* Colosseum Arches - Top Tier */}
          <g fill="#2B140A" stroke="#3A1D0E" strokeWidth="1.5">
            <path d="M250,262 C250,254 260,254 260,262 L260,272 L250,272 Z" />
            <path d="M266,262 C266,254 276,254 276,262 L276,272 L266,272 Z" />
            <path d="M292,270 C292,263 302,263 302,270 L302,280 L292,280 Z" />
            <path d="M308,270 C308,263 318,263 318,270 L318,280 L308,280 Z" />
            <path d="M340,280 C340,273 350,273 350,280 L350,290 L340,290 Z" />
            <path d="M356,280 C356,273 366,273 366,280 L366,290 L356,290 Z" />
            <path d="M390,292 C390,285 400,285 400,292 L400,302 L390,302 Z" />
            <path d="M406,292 C406,285 416,285 416,292 L416,302 L406,302 Z" />
          </g>

          {/* Colosseum Arches - Middle Tier (Larger) */}
          <g fill="#241108" stroke="#3A1D0E" strokeWidth="1.5">
            <path d="M245,282 C245,274 257,274 257,282 L257,298 L245,298 Z" />
            <path d="M263,282 C263,274 275,274 275,282 L275,298 L263,298 Z" />
            <path d="M281,284 C281,276 293,276 293,284 L293,300 L281,300 Z" />
            <path d="M299,286 C299,278 311,278 311,286 L311,302 L299,302 Z" />
            <path d="M317,288 C317,280 329,280 329,288 L329,304 L317,304 Z" />
            <path d="M335,292 C335,284 347,284 347,292 L347,308 L335,308 Z" />
            <path d="M353,296 C353,288 365,288 365,296 L365,312 L353,312 Z" />
            <path d="M371,300 C371,292 383,292 383,300 L383,316 L371,316 Z" />
            <path d="M389,304 C389,296 401,296 401,304 L401,320 L389,320 Z" />
            <path d="M407,308 C407,300 419,300 419,308 L419,324 L407,324 Z" />
          </g>

          {/* Colosseum Ground Tier Arches */}
          <g fill="#1F0D06" stroke="#3A1D0E" strokeWidth="1.5">
            <path d="M246,310 C246,302 258,302 258,310 L258,330 L246,330 Z" />
            <path d="M264,312 C264,304 276,304 276,312 L276,332 L264,332 Z" />
            <path d="M282,314 C282,306 294,306 294,314 L294,334 L282,334 Z" />
            <path d="M300,317 C300,309 312,309 312,317 L312,338 L300,338 Z" />
            <path d="M318,320 C318,312 330,312 330,320 L330,342 L318,342 Z" />
            <path d="M336,324 C336,316 348,316 348,324 L348,346 L336,346 Z" />
            <path d="M354,328 C354,320 366,320 366,328 L366,350 L354,350 Z" />
            <path d="M372,332 C372,324 384,324 384,332 L384,354 L372,354 Z" />
            <path d="M390,336 C390,328 402,328 402,336 L402,358 L390,358 Z" />
            <path d="M408,340 C408,332 420,332 420,340 L420,362 L408,362 Z" />
          </g>

          {/* Roman Cypress Trees and Olive Trees in Foreground */}
          <path d="M220,350 C215,335 225,320 230,350 Z" fill="#2E391F" stroke="#1C2313" strokeWidth="1" />
          <path d="M435,360 C430,340 442,325 448,360 Z" fill="#2E391F" stroke="#1C2313" strokeWidth="1" />
          <circle cx="215" cy="380" r="18" fill="#515B38" stroke="#252C1A" strokeWidth="1.5" />
          <circle cx="240" cy="385" r="14" fill="#3D452A" stroke="#252C1A" strokeWidth="1.5" />
        </g>

        {/* ========================================================================= */}
        {/* LANDMARK 3: CHICHÉN ITZÁ MAYAN PYRAMID (Center, X: 470 to 650)            */}
        {/* ========================================================================= */}
        <g
          id="landmark-chichenitza"
          className="cursor-pointer transition-opacity hover:opacity-95"
          onMouseEnter={() => setHoveredLandmark('chichenitza')}
          onMouseLeave={() => setHoveredLandmark(null)}
          onClick={() => handleLandmarkClick('chichenitza')}
        >
          {/* Dense Forest Green & Mountain Behind Pyramid */}
          <path d="M460,330 C490,260 560,250 630,320 L460,350 Z" fill="url(#oliveHills)" stroke="#222814" strokeWidth="1.5" />
          
          {/* Chichen Itza Pyramid Body (Tiered Terraces) */}
          {/* Tier 1 (Base) */}
          <polygon points="460,380 635,372 610,345 480,350" fill="#DEC9AE" stroke="#3D3024" strokeWidth="2" />
          {/* Tier 2 */}
          <polygon points="480,350 610,345 590,320 498,324" fill="#CBB497" stroke="#3D3024" strokeWidth="2" />
          {/* Tier 3 */}
          <polygon points="498,324 590,320 575,298 512,301" fill="#BAA082" stroke="#3D3024" strokeWidth="2" />
          {/* Tier 4 */}
          <polygon points="512,301 575,298 562,280 524,282" fill="#AA8F71" stroke="#3D3024" strokeWidth="2" />
          
          {/* Summit Temple (El Castillo Upper Sanctuary) */}
          <rect x="528" y="260" width="30" height="20" fill="#EADBC6" stroke="#3D3024" strokeWidth="2" />
          <polygon points="526,260 560,260 554,250 532,250" fill="#D2C0A8" stroke="#3D3024" strokeWidth="1.5" />
          {/* Summit Temple Doors */}
          <rect x="536" y="267" width="5" height="13" fill="#2E2319" />
          <rect x="545" y="267" width="5" height="13" fill="#2E2319" />

          {/* Central Ceremonial Grand Staircase */}
          <polygon points="536,280 550,280 565,375 528,377" fill="#887056" stroke="#3D3024" strokeWidth="1.5" />
          {/* Step Linework */}
          <line x1="535" y1="290" x2="551" y2="290" stroke="#3D3024" strokeWidth="1" />
          <line x1="534" y1="302" x2="553" y2="302" stroke="#3D3024" strokeWidth="1" />
          <line x1="532" y1="315" x2="555" y2="315" stroke="#3D3024" strokeWidth="1" />
          <line x1="531" y1="330" x2="558" y2="330" stroke="#3D3024" strokeWidth="1" />
          <line x1="529" y1="345" x2="561" y2="345" stroke="#3D3024" strokeWidth="1" />
          <line x1="528" y1="360" x2="564" y2="360" stroke="#3D3024" strokeWidth="1" />
          
          {/* Snake Head Balustrades at base */}
          <circle cx="528" cy="377" r="3" fill="#241B12" />
          <circle cx="565" cy="375" r="3" fill="#241B12" />
        </g>

        {/* Rolling Hills & Lush Trees behind Taj Mahal */}
        <g id="rolling-central-hills">
          {/* Dark Charcoal Brown Textured Hill */}
          <path d="M620,380 C680,240 780,210 860,340 L620,380 Z" fill="url(#darkMountain)" stroke="#221B14" strokeWidth="2" />
          <path d="M620,380 C680,240 780,210 860,340 L620,380 Z" fill="url(#fineHatch)" opacity="0.6" />
          
          {/* Stylized Rounded Tree Groves */}
          <circle cx="650" cy="330" r="18" fill="#58603C" stroke="#252A18" strokeWidth="1.5" />
          <circle cx="680" cy="310" r="24" fill="#3D4527" stroke="#252A18" strokeWidth="1.5" />
          <circle cx="705" cy="325" r="16" fill="#6A734B" stroke="#252A18" strokeWidth="1.5" />
          <circle cx="740" cy="345" r="20" fill="#4B5232" stroke="#252A18" strokeWidth="1.5" />
          
          {/* Terracotta Ground Ridge Pathway */}
          <path d="M590,400 C680,360 820,370 940,350 L940,400 L590,400 Z" fill="#996041" stroke="#381E12" strokeWidth="2" />
          <path d="M620,400 C740,370 850,380 940,360 L940,400 Z" fill="url(#hatch)" opacity="0.3" />
        </g>

        {/* ========================================================================= */}
        {/* LANDMARK 4: THE TAJ MAHAL (Center Right, X: 840 to 1100)                  */}
        {/* ========================================================================= */}
        <g
          id="landmark-tajmahal"
          className="cursor-pointer transition-opacity hover:opacity-95"
          onMouseEnter={() => setHoveredLandmark('tajmahal')}
          onMouseLeave={() => setHoveredLandmark(null)}
          onClick={() => handleLandmarkClick('tajmahal')}
        >
          {/* Plinth Base Terrace */}
          <rect x="850" y="325" width="220" height="25" fill="#F4EFE6" stroke="#3A3228" strokeWidth="2" />
          <line x1="850" y1="333" x2="1070" y2="333" stroke="#8C7D6A" strokeWidth="1" />
          
          {/* Outer Left Minaret */}
          <g id="taj-minaret-left">
            <rect x="855" y="225" width="12" height="100" fill="#F4EFE6" stroke="#3A3228" strokeWidth="1.5" />
            <polygon points="853,225 869,225 867,220 855,220" fill="#E2D6C3" stroke="#3A3228" strokeWidth="1.5" />
            <polygon points="854,260 868,260 866,257 856,257" fill="#E2D6C3" stroke="#3A3228" strokeWidth="1" />
            <polygon points="854,295 868,295 866,292 856,292" fill="#E2D6C3" stroke="#3A3228" strokeWidth="1" />
            {/* Minaret Dome & Finial */}
            <path d="M856,220 C856,210 866,210 866,220 Z" fill="#F8F4EC" stroke="#3A3228" strokeWidth="1.5" />
            <line x1="861" y1="210" x2="861" y2="202" stroke="#3A3228" strokeWidth="1.5" />
          </g>

          {/* Outer Right Minaret */}
          <g id="taj-minaret-right">
            <rect x="1053" y="225" width="12" height="100" fill="#F4EFE6" stroke="#3A3228" strokeWidth="1.5" />
            <polygon points="1051,225 1067,225 1065,220 1053,220" fill="#E2D6C3" stroke="#3A3228" strokeWidth="1.5" />
            <polygon points="1052,260 1066,260 1064,257 1054,257" fill="#E2D6C3" stroke="#3A3228" strokeWidth="1" />
            <polygon points="1052,295 1066,295 1064,292 1054,292" fill="#E2D6C3" stroke="#3A3228" strokeWidth="1" />
            {/* Minaret Dome & Finial */}
            <path d="M1054,220 C1054,210 1064,210 1064,220 Z" fill="#F8F4EC" stroke="#3A3228" strokeWidth="1.5" />
            <line x1="1059" y1="210" x2="1059" y2="202" stroke="#3A3228" strokeWidth="1.5" />
          </g>

          {/* Main Central Tomb Pavilion */}
          <rect x="885" y="250" width="150" height="75" fill="#FAF6EE" stroke="#3A3228" strokeWidth="2" />
          
          {/* Grand Central Iwan (Arch) */}
          <path
            d="M930,325 L930,278 C930,256 990,256 990,278 L990,325 Z"
            fill="#322920"
            stroke="#3A3228"
            strokeWidth="2"
          />
          {/* Inner Recessed Doorway Arch */}
          <path
            d="M944,325 L944,292 C944,278 976,278 976,292 L976,325 Z"
            fill="#1E1711"
            stroke="#3A3228"
            strokeWidth="1.5"
          />

          {/* Side Arches (Left Tiered Alcoves) */}
          <path d="M895,274 C895,266 915,266 915,274 L915,286 L895,286 Z" fill="#322920" stroke="#3A3228" strokeWidth="1" />
          <path d="M895,302 C895,294 915,294 915,302 L915,320 L895,320 Z" fill="#322920" stroke="#3A3228" strokeWidth="1" />

          {/* Side Arches (Right Tiered Alcoves) */}
          <path d="M1005,274 C1005,266 1025,266 1025,274 L1025,286 L1005,286 Z" fill="#322920" stroke="#3A3228" strokeWidth="1" />
          <path d="M1005,302 C1005,294 1025,294 1025,302 L1025,320 L1005,320 Z" fill="#322920" stroke="#3A3228" strokeWidth="1" />

          {/* Secondary Kiosks / Chattris Left and Right of Dome */}
          <rect x="906" y="235" width="18" height="15" fill="#F4EFE6" stroke="#3A3228" strokeWidth="1.5" />
          <path d="M904,235 C904,226 926,226 926,235 Z" fill="#F8F4EC" stroke="#3A3228" strokeWidth="1.5" />
          
          <rect x="996" y="235" width="18" height="15" fill="#F4EFE6" stroke="#3A3228" strokeWidth="1.5" />
          <path d="M994,235 C994,226 1016,226 1016,235 Z" fill="#F8F4EC" stroke="#3A3228" strokeWidth="1.5" />

          {/* Iconic Onion Dome (Bulbous Dome) */}
          <path
            d="M932,250 C926,220 936,192 960,185 C984,192 994,220 988,250 Z"
            fill="#FAF6EF"
            stroke="#3A3228"
            strokeWidth="2.5"
          />
          {/* Decorative Dome Lotus Petal Crest & Golden Finial */}
          <path d="M955,186 C955,176 965,176 965,186 Z" fill="#D5C4A6" stroke="#3A3228" strokeWidth="1.5" />
          <line x1="960" y1="180" x2="960" y2="162" stroke="#3A3228" strokeWidth="2" />
          <circle cx="960" cy="160" r="2.5" fill="#D4AF37" stroke="#3A3228" strokeWidth="1" />

          {/* Fine architectural etched lines on Taj Mahal */}
          <line x1="885" y1="262" x2="1035" y2="262" stroke="#A6947D" strokeWidth="1" strokeDasharray="3 2" />
        </g>

        {/* ========================================================================= */}
        {/* LANDMARK 5: CHRIST THE REDEEMER (Far Right, X: 1100 to 1440)               */}
        {/* ========================================================================= */}
        <g
          id="landmark-christ"
          className="cursor-pointer transition-opacity hover:opacity-95"
          onMouseEnter={() => setHoveredLandmark('christ')}
          onMouseLeave={() => setHoveredLandmark(null)}
          onClick={() => handleLandmarkClick('christ')}
        >
          {/* Corcovado Mountain Peak & Forest Ridge */}
          <path
            d="M1090,400 L1150,330 L1210,315 L1240,290 L1285,290 L1310,320 L1380,310 L1440,325 L1440,400 Z"
            fill="url(#darkMountain)"
            stroke="#201812"
            strokeWidth="2.5"
          />
          <path
            d="M1090,400 L1150,330 L1210,315 L1240,290 L1285,290 L1310,320 L1380,310 L1440,325 L1440,400 Z"
            fill="url(#hatch)"
            opacity="0.4"
          />

          {/* Tropical Trees & Greenery on Mountain Ridge */}
          <circle cx="1190" cy="330" r="14" fill="#3D4527" stroke="#202613" strokeWidth="1.5" />
          <circle cx="1215" cy="325" r="18" fill="#545E36" stroke="#202613" strokeWidth="1.5" />
          <circle cx="1320" cy="330" r="16" fill="#424B2C" stroke="#202613" strokeWidth="1.5" />
          <circle cx="1350" cy="325" r="22" fill="#2E371C" stroke="#202613" strokeWidth="1.5" />
          <circle cx="1390" cy="340" r="20" fill="#58633B" stroke="#202613" strokeWidth="1.5" />

          {/* Statue Pedestal (Square stone base atop mountain) */}
          <rect x="1248" y="278" width="28" height="24" fill="#2E2822" stroke="#1C1712" strokeWidth="2" />

          {/* Christ the Redeemer Statue */}
          {/* Body Robe / Torso */}
          <path
            d="M1256,220 L1268,220 L1272,280 L1252,280 Z"
            fill="#D5CBBF"
            stroke="#28221B"
            strokeWidth="2"
          />
          {/* Robe Pleats / Art Deco Vertical Folds */}
          <line x1="1260" y1="225" x2="1258" y2="280" stroke="#362E25" strokeWidth="1" />
          <line x1="1264" y1="225" x2="1264" y2="280" stroke="#362E25" strokeWidth="1" />
          <line x1="1268" y1="225" x2="1270" y2="280" stroke="#362E25" strokeWidth="1" />

          {/* Head & Neck */}
          <ellipse cx="1262" cy="204" rx="5" ry="6.5" fill="#D5CBBF" stroke="#28221B" strokeWidth="1.5" />
          {/* Hair / Beard Profile */}
          <path d="M1257,204 C1257,209 1267,209 1267,204" stroke="#28221B" strokeWidth="1" fill="none" />

          {/* Outstretched Arms (Iconic Cross Posture) */}
          {/* Left Arm */}
          <path
            d="M1256,220 L1204,221 C1200,221 1198,225 1202,227 L1256,228 Z"
            fill="#D5CBBF"
            stroke="#28221B"
            strokeWidth="2"
          />
          {/* Right Arm */}
          <path
            d="M1268,220 L1320,221 C1324,221 1326,225 1322,227 L1268,228 Z"
            fill="#D5CBBF"
            stroke="#28221B"
            strokeWidth="2"
          />
          {/* Outstretched Hands */}
          <circle cx="1200" cy="224" r="2.5" fill="#D5CBBF" stroke="#28221B" strokeWidth="1" />
          <circle cx="1324" cy="224" r="2.5" fill="#D5CBBF" stroke="#28221B" strokeWidth="1" />
        </g>

        {/* Foreground Earthy Terracotta Hill Texture across bottom */}
        <g id="foreground-earth-and-grass">
          <path
            d="M0,385 Q350,360 700,375 T1440,365 L1440,400 L0,400 Z"
            fill="#874D2E"
            opacity="0.9"
            stroke="#381D0E"
            strokeWidth="1.5"
          />
          {/* Tiny stylized weed blades / cross hatching on foreground */}
          <g stroke="#381D0E" strokeWidth="1.5" strokeLinecap="round">
            <line x1="80" y1="395" x2="84" y2="385" />
            <line x1="85" y1="395" x2="89" y2="383" />
            <line x1="320" y1="395" x2="324" y2="386" />
            <line x1="580" y1="395" x2="583" y2="384" />
            <line x1="820" y1="395" x2="823" y2="385" />
            <line x1="1120" y1="395" x2="1124" y2="386" />
            <line x1="1260" y1="395" x2="1263" y2="385" />
          </g>
        </g>
      </svg>
    </div>
  );
};
