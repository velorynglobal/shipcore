import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Simple test credentials
const testUsers = [
  {
    id: 'test-user-1',
    name: 'Test User',
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'password123',
  },
];

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // In production, replace with real database check
        const user = testUsers.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        );

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
});

export { handler as GET, handler as POST };