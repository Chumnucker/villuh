import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface InvitationProps {
  inviteUrl: string
  inviterName: string
  orgName: string
  role: string
}

export function Invitation({ inviteUrl, inviterName, orgName, role }: InvitationProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to join {orgName} on Villuh</Preview>
      <Body style={{ fontFamily: 'Inter, Arial, sans-serif', backgroundColor: '#fafafa', padding: '32px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px', maxWidth: '480px' }}>
          <Heading style={{ fontSize: '24px', fontWeight: 500, color: '#0a0a0a' }}>
            {inviterName} invited you to {orgName}
          </Heading>
          <Text style={{ fontSize: '14px', color: '#525252', lineHeight: '1.5' }}>
            You&apos;ve been invited to join {orgName} as a {role}.
          </Text>
          <Button
            href={inviteUrl}
            style={{ backgroundColor: '#0a0a0a', color: '#ffffff', padding: '12px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 500, textDecoration: 'none', display: 'inline-block', marginTop: '16px' }}
          >
            Accept invitation
          </Button>
          <Text style={{ fontSize: '12px', color: '#a3a3a3', marginTop: '24px' }}>
            This invitation expires in 7 days.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
