export const runtime = 'experimental-edge';

export function GET(request) {
  const ip = request.ip;
  const country = request.geo.country;
  return Response.json({ ip, country });
}
