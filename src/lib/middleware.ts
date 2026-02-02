import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function withAuth(
  request: NextRequest,
  allowedRoles: string[] = []
) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(token.role as string)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return null;
}

export function withRole(allowedRoles: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      const authResult = await withAuth(request, allowedRoles);
      if (authResult) {
        return authResult;
      }
      return originalMethod.apply(this, [request, ...args]);
    };

    return descriptor;
  };
}
