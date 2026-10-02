import React, { useEffect } from 'react';

export default function MaintenanceGate() {
  useEffect(() => {
    document.title = '404: NOT_FOUND';
    
    // Replace all favicon links with the standard neutral globe/map balloon icon
    const links = document.querySelectorAll("link[rel*='icon']");
    links.forEach(l => l.remove());

    const globeIcon = document.createElement('link');
    globeIcon.type = 'image/svg+xml';
    globeIcon.rel = 'shortcut icon';
    globeIcon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'/><line x1='2' y1='12' x2='22' y2='12'/><path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1-4-10z'/></svg>";
    document.getElementsByTagName('head')[0].appendChild(globeIcon);
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
