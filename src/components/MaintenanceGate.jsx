import React, { useEffect } from 'react';

export default function MaintenanceGate() {
  useEffect(() => {
    document.title = '404: NOT_FOUND';
    
    // Replace all favicon links with the standard map location pin balloon icon
    const links = document.querySelectorAll("link[rel*='icon']");
    links.forEach(l => l.remove());

    const fallbackGlobeIcon = document.createElement('link');
    fallbackGlobeIcon.type = 'image/svg+xml';
    fallbackGlobeIcon.rel = 'shortcut icon';
    fallbackGlobeIcon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' width='16' height='16'><path fill='%23737373' d='M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 1.5a6.47 6.47 0 0 1 4.54 1.87L9.8 6.11A2.5 2.5 0 0 0 7.5 8.5v.75L4.12 5.87A6.47 6.47 0 0 1 8 1.5zM1.5 8c0-.9.18-1.76.51-2.54l3.18 3.18A2.5 2.5 0 0 0 7.5 11v1.5L4.12 15.87A6.47 6.47 0 0 1 1.5 8zm6.5 6.5v-1.5a1 1 0 0 1 1-1h1.5a1 1 0 0 0 1-1V8.5a1 1 0 0 0-1-1H7.5A1.5 1.5 0 0 1 6 6v-.75a1 1 0 0 1 .29-.71l3.5-3.5A6.5 6.5 0 0 1 14.5 8c0 3.59-2.91 6.5-6.5 6.5z'/></svg>";
    document.getElementsByTagName('head')[0].appendChild(fallbackGlobeIcon);
  }, []);
  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col items-center justify-center p-6 selection:bg-black selection:text-white font-sans antialiased">
      
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* Main Heading & Description */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-[#111111] tracking-tight">
            This page doesn’t exist
          </h1>
          <p className="text-sm text-[#666666] leading-relaxed">
            It may have been moved, removed, or never existed.
          </p>
        </div>

        {/* Vercel Error Code Container */}
        <div className="pt-2">
          <div className="inline-block px-4 py-2 rounded-md bg-[#f5f5f5] border border-[#e5e5e5] text-xs font-mono text-[#111111] font-medium shadow-sm">
            404: DEPLOYMENT_NOT_FOUND
          </div>
        </div>

        {/* Vercel Trace / Request ID */}
        <div className="pt-8">
          <p className="text-[11px] font-mono text-[#888888] tracking-tight">
            cdg1::6cl2r-1790963931287-0d797d55c6dc
          </p>
        </div>

      </div>

    </div>
  );
}
