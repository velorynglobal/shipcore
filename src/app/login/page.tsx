export default function LoginPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const redirectTo = searchParams.redirectTo as string || '/';

  return (
    <div style={{
      maxWidth: 400,
      margin: '100px auto',
      padding: 40,
      background: 'white',
      borderRadius: 12,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    }}>
      <h1 style={{ fontSize: 24, marginBottom: 24, textAlign: 'center' }}>Login</h1>
      
      <form action="/api/auth/signin/credentials" method="post">
        <input type="hidden" name="callbackUrl" value={redirectTo} />
        <input type="hidden" name="redirect" value="true" />
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Email</label>
          <input
            type="email"
            name="email"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
            }}
            defaultValue="test@example.com"
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Password</label>
          <input
            type="password"
            name="password"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
            }}
            defaultValue="password123"
          />
        </div>
        
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            background: '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
