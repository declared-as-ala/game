export interface OpenSourcePackage {
  name: string;
  version: string;
  license: string;
  homepage: string;
  description: string;
  noticeText: string;
}

export function getOpenSourceNotices(): OpenSourcePackage[] {
  return [
    {
      name: 'PixiJS',
      version: '8.7.3',
      license: 'MIT',
      homepage: 'https://pixijs.com/',
      description: 'The HTML5 2D Creation Engine with WebGL / WebGPU acceleration.',
      noticeText: `Copyright (c) 2013-2024 Mathew Groves, Chad Engler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`,
    },
    {
      name: 'Planck.js',
      version: '1.0.3',
      license: 'zlib License',
      homepage: 'https://piqnt.com/planck.js/',
      description: '2D JavaScript physics engine for cross-platform games (Box2D rewrite).',
      noticeText: `Copyright (c) 2016-2024 Erin Catto, Ali Shakiba

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
claim that you wrote the original software.
2. Altered source versions must be plainly marked as such, and must not be
misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.`,
    },
    {
      name: 'Capacitor',
      version: '7.0.1',
      license: 'MIT',
      homepage: 'https://capacitorjs.com/',
      description: 'Cross-platform native runtime for iOS, Android, and web mobile apps.',
      noticeText: `Copyright (c) 2017-present Drifty Co.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.`,
    },
    {
      name: 'Howler.js',
      version: '2.2.4',
      license: 'MIT',
      homepage: 'https://howlerjs.com/',
      description: 'Audio library for the modern web with Web Audio API fallback.',
      noticeText: `Copyright (c) 2013-2024 James Simpson and Goldfire Studios, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.`,
    },
    {
      name: 'canvas-confetti',
      version: '1.9.4',
      license: 'ISC',
      homepage: 'https://www.kirilv.com/canvas-confetti/',
      description: 'High-performance canvas-based particle celebration effect.',
      noticeText: `Copyright (c) 2020, Kiril Vatev <catdad@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES.`,
    },
    {
      name: 'idb',
      version: '8.0.2',
      license: 'ISC',
      homepage: 'https://github.com/jakearchibald/idb',
      description: 'Lightweight Promise-based wrapper around IndexedDB.',
      noticeText: `Copyright 2016-2024 Jake Archibald

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES.`,
    },
  ];
}
