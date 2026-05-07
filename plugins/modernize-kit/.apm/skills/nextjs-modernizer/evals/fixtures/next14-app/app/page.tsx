import { cookies, headers, draftMode } from 'next/headers';

export default function HomePage() {
  const session = cookies().get('session');
  const userAgent = headers().get('user-agent');
  const isDraft = draftMode().isEnabled;
  const data = fetch('https://api.example.com/products');
  return null;
}
