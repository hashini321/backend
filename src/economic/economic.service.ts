import { Injectable, BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EconomicService {
  constructor(private readonly configService: ConfigService) {}

  async fetchEvents(countries?: string) {
    const key = this.configService.get<string>('RAPIDAPI_KEY');
    const host = this.configService.get<string>('RAPIDAPI_HOST') ?? 'economic-trading-forex-events-calendar.p.rapidapi.com';

    if (!key) throw new BadRequestException('RAPIDAPI_KEY not configured on server');

    const url = new URL('https://economic-trading-forex-events-calendar.p.rapidapi.com/fxstreet');
    if (countries) url.searchParams.set('countries', countries);

    const res = await fetch(url.toString(), {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new HttpException(`External API error: ${res.status} ${text}`, res.status);
    }

    const data = await res.json();

    // Return raw data; controller caches it
    return data;
  }
}
