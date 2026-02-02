import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from './mongodb';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Authorize called with phone:', credentials?.phone);

        if (!credentials?.phone || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }

        try {
          console.log('Connecting to database...');
          await connectDB();

          // Clean phone number (remove spaces, dashes, parentheses)
          const cleanPhone = credentials.phone.replace(/[\s\-\(\)]/g, '');

          console.log('Looking for user with phone:', cleanPhone);
          const user = await User.findOne({
            phone: cleanPhone,
            isActive: true
          });

          if (!user) {
            console.log('User not found or inactive');
            return null;
          }

          console.log('User found, checking password...');
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log('Invalid password');
            return null;
          }

          console.log('Password valid, updating last login...');
          // Update last login
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          const userData = {
            id: user._id.toString(),
            email: user.email,
            phone: user.phone,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            image: user.avatar,
          };

          console.log('Returning user data:', userData);
          return userData;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
