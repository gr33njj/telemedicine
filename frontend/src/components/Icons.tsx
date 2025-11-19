import React from 'react';

export const renderIcon = (type: string, size: number = 24) => {
  const strokeWidth = size < 24 ? 2 : 1.5;
  
  const iconProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
  };

  const pathProps = {
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'dashboard':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m-9.5-2.5A2.5 2.5 0 0121 4.5A2.5 2.5 0 018.5 9" />
        </svg>
      );
    case 'doctors':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a4 4 0 118 0m-8 0a4 4 0 100 8m0-8a4 4 0 110 8" />
        </svg>
      );
    case 'consultations':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'schedule':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path {...pathProps} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    case 'check':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'documents':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'users':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'star':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    case 'video':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case 'video-off':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 3l18 18M5 5l10 10M5 19h8a2 2 0 002-2v-1" />
        </svg>
      );
    case 'mic':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M12 1a3 3 0 00-3 3v6a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path {...pathProps} d="M19 10a7 7 0 01-14 0M12 17v6m-4 0h8" />
        </svg>
      );
    case 'mic-off':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M15 10V4a3 3 0 00-5.356-1.857M9 5v4m0 0a3 3 0 005 2.236M9 9a3 3 0 003 3m-6 0a7 7 0 0012 0m-6 5v6m-4 0h8M3 3l18 18" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M7 8h10M7 12h6" />
          <path {...pathProps} d="M21 12a9 9 0 11-3-6.708L21 5v7z" />
        </svg>
      );
    case 'paperclip':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path
            {...pathProps}
            d="M15.172 7l-7.071 7.071a4 4 0 105.657 5.657l7.07-7.07a6 6 0 10-8.486-8.486l-7.07 7.07"
          />
        </svg>
      );
    case 'send':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M3 10l18-7-7 18-2-7-7-2z" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path
            {...pathProps}
            d="M15.05 5.05a2.5 2.5 0 013.536 0l1.364 1.364a2.5 2.5 0 010 3.536L17 15l-3 3c-3.59-1.794-6.206-4.411-8-8l3-3 5.05-5.05z"
          />
          <path {...pathProps} d="M5 4h4v4" />
        </svg>
      );
    case 'phone-end':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path
            {...pathProps}
            d="M21 15v4a2 2 0 01-2 2h-.586a2 2 0 01-1.414-.586L12 15l-5 5a2 2 0 01-1.414.586H5a2 2 0 01-2-2v-4a8 8 0 018-8h2a8 8 0 018 8z"
          />
          <path {...pathProps} d="M3 3l18 18" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'search':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      );
    case 'arrow-up':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M5 10l7-7 7 7M12 3v18" />
        </svg>
      );
    case 'arrow-down':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M19 14l-7 7-7-7M12 21V3" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case 'document':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'download':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path {...pathProps} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case 'timer':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'x-circle':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M10 14l4-4m0 0l-4-4m4 4l4 4m0 0l4-4m-4 4l-4-4M9 10a9 9 0 1118 0 9 9 0 01-18 0z" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...iconProps} width={size} height={size}>
          <path {...pathProps} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

