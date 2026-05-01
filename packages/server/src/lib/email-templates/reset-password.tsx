import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

export function ResetPassword({ resetUrl }: { resetUrl: string }) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Villuh password</Preview>
      <Body style={{ fontFamily: 'Inter, Arial, sans-serif', backgroundColor: '#fafafa', padding: '32px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px', maxWidth: '480px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 500, color: '#0a0a0a' }}>Reset your password</Heading>
          <Text style={{ fontSize: '14px', color: '#525252', lineHeight: '1.5' }}>
            Click below to set a new password. The link expires in 1 hour.
          </Text>
          <Button
            href={resetUrl}
            style={{ backgroundColor: '#0a0a0a', color: '#ffffff', padding: '12px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 500, textDecoration: 'none', display: 'inline-block', marginTop: '16px' }}
          >
            Set new password
          </Button>
          <Text style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '24px' }}>
            If you did not request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
