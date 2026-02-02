import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {


  
  const { pathname } = request.nextUrl;

  // Allow public access to root route
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Check if the request is for login or register pages
  if (pathname === '/login' || pathname === '/register') {
    
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If user is already authenticated, redirect to appropriate dashboard
    if (token) {
      
      switch (token.role) {
        case 'admin':
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        case 'instructor':
          return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
        case 'student':
          return NextResponse.redirect(new URL('/student/dashboard', request.url));
        default:
          return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // Check if the request is for admin routes
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If token exists but user is not admin, redirect to unauthorized
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Check if the request is for instructor routes
  if (pathname.startsWith('/instructor')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    console.log('token', token);

    // If token exists but user is not instructor or admin, redirect to unauthorized
    if (token.role !== 'instructor' && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  console.log("pathname.startsWith('/student')", pathname.startsWith('/student'));
  // Check if the request is for student routes
  if (pathname.startsWith('/student')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token, redirect to login
    if (!token) {
      return NextResponse.next();
    }

    // If token exists but user is not student, instructor, or admin, redirect to unauthorized
    if (!['student', 'instructor', 'admin'].includes(token.role as string)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/admin/:path*',
    '/instructor/:path*',
    '/student/:path*'
  ]
};
