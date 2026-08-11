import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

export function VerifyEmail({ verifyUrl }: { verifyUrl: string }) {
  return (
    <Html>
      <Head />
      <Preview>Verify your Villuh email to get started</Preview>
      <Body style={{ fontFamily: 'Inter, Arial, sans-serif', backgroundColor: '#fafafa', padding: '32px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px', maxWidth: '480px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 500, color: '#0a0a0a' }}>Welcome to Villuh</Heading>
          <Text style={{ fontSize: '14px', color: '#525252', lineHeight: '1.5' }}>
            Click the button below to verify your email address and finish creating your account.
          </Text>
          <Button
            href={verifyUrl}
            style={{ backgroundColor: '#0a0a0a', color: '#ffffff', padding: '12px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 500, textDecoration: 'none', display: 'inline-block', marginTop: '16px' }}
          >
            Verify email
          </Button>
          <Text style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '24px' }}>
            If you did not create a Villuh account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
