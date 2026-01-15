'use client'

import Image from 'next/image'
import ProfileDropdown from './ProfileDropdown'

interface HeaderProps {
  showBackButton?: boolean
  backHref?: string
  showProfile?: boolean
  rightContent?: React.ReactNode
}

export default function Header({ showBackButton, backHref = '/', showProfile, rightContent }: HeaderProps) {
  return (
    <div className="relative">
      <header className="bg-[#022d94] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="https://cdn.brandfetch.io/idH3f-E2D0/theme/light/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1764518967107"
              alt="Check24 Logo"
              width={120}
              height={32}
              className="h-8 w-auto"
              unoptimized
            />
          </div>
          
          <div className="flex items-center gap-4">
            {rightContent}
            {showProfile && <ProfileDropdown />}
          </div>
        </div>
      </header>
      
      {showBackButton && (
        <a 
          href={backHref}
          className="absolute left-4 top-full -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg transition text-[#022d94] z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </a>
      )}
    </div>
  )
}
