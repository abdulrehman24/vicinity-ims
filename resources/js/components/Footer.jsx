import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiHeart } = FiIcons;

function Footer() {
  return (
    <footer className="py-12 px-8 text-center mt-auto border-t border-gray-100/50">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-2 text-[#4a5a67]">
          <SafeIcon 
            icon={FiHeart} 
            className="text-[#ebc1b6] text-lg animate-pulse fill-[#ebc1b6]" 
          />
          <span className="font-bold text-sm tracking-tight italic">
            have a great and fun shoot
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="h-px w-8 bg-[#ebc1b6]/40" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4a5a67]/30">
            maintained by vicinity it team
          </p>
          <div className="h-px w-8 bg-[#ebc1b6]/40" />
        </div>
      </div>
    </footer>
  );
}

export default Footer;