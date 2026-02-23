import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReviewItem {
  id: string;
  sourceTable: string;
  rating: number;
  reviewTitle: string | null;
  reviewText: string | null;
  isVerified: boolean;
  wouldRecommend: boolean;
  createdAt: string;
  reviewerName: string;
  reviewerType: string;
  revieweeName: string;
  revieweeType: string;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ReviewItem[]> {
    const [
      mcrRatings,
      mtrRatings,
      cpmrRatings,
      tpmrRatings,
      lcRatings,
    ] = await Promise.all([
      this.prisma.manufacturer_coal_ratings.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          manufacturers: { select: { name: true } },
          coal_providers: { select: { name: true } },
        },
      }),
      this.prisma.manufacturer_transport_ratings.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          manufacturers: { select: { name: true } },
          transport_providers: { select: { name: true, company_name: true } },
        },
      }),
      this.prisma.coal_provider_manufacturer_ratings.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          coal_providers: { select: { name: true } },
          manufacturers: { select: { name: true } },
        },
      }),
      this.prisma.transport_provider_manufacturer_ratings.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          transport_providers: { select: { name: true, company_name: true } },
          manufacturers: { select: { name: true } },
        },
      }),
      this.prisma.labour_contractor_ratings.findMany({
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          labour_contractors: { select: { name: true, company_name: true } },
        },
      }),
    ]);

    const reviews: ReviewItem[] = [
      ...mcrRatings.map((r) => ({
        id: r.id,
        sourceTable: 'manufacturer_coal_ratings',
        rating: r.rating,
        reviewTitle: r.review_title,
        reviewText: r.review_text,
        isVerified: r.is_verified ?? false,
        wouldRecommend: r.would_recommend ?? true,
        createdAt: r.created_at?.toISOString() || '',
        reviewerName: r.manufacturers?.name || '',
        reviewerType: 'Manufacturer',
        revieweeName: r.coal_providers?.name || '',
        revieweeType: 'Coal Provider',
      })),
      ...mtrRatings.map((r) => ({
        id: r.id,
        sourceTable: 'manufacturer_transport_ratings',
        rating: r.rating,
        reviewTitle: r.review_title,
        reviewText: r.review_text,
        isVerified: r.is_verified ?? false,
        wouldRecommend: r.would_recommend ?? true,
        createdAt: r.created_at?.toISOString() || '',
        reviewerName: r.manufacturers?.name || '',
        reviewerType: 'Manufacturer',
        revieweeName: r.transport_providers?.company_name || r.transport_providers?.name || '',
        revieweeType: 'Transport Provider',
      })),
      ...cpmrRatings.map((r) => ({
        id: r.id,
        sourceTable: 'coal_provider_manufacturer_ratings',
        rating: r.rating,
        reviewTitle: r.review_title,
        reviewText: r.review_text,
        isVerified: r.is_verified ?? false,
        wouldRecommend: r.would_work_again ?? true,
        createdAt: r.created_at?.toISOString() || '',
        reviewerName: r.coal_providers?.name || '',
        reviewerType: 'Coal Provider',
        revieweeName: r.manufacturers?.name || '',
        revieweeType: 'Manufacturer',
      })),
      ...tpmrRatings.map((r) => ({
        id: r.id,
        sourceTable: 'transport_provider_manufacturer_ratings',
        rating: r.rating,
        reviewTitle: r.review_title,
        reviewText: r.review_text,
        isVerified: r.is_verified ?? false,
        wouldRecommend: r.would_work_again ?? true,
        createdAt: r.created_at?.toISOString() || '',
        reviewerName: r.transport_providers?.company_name || r.transport_providers?.name || '',
        reviewerType: 'Transport Provider',
        revieweeName: r.manufacturers?.name || '',
        revieweeType: 'Manufacturer',
      })),
      ...lcRatings.map((r) => ({
        id: r.id,
        sourceTable: 'labour_contractor_ratings',
        rating: r.rating,
        reviewTitle: null,
        reviewText: r.review,
        isVerified: false,
        wouldRecommend: r.would_recommend ?? true,
        createdAt: r.created_at?.toISOString() || '',
        reviewerName: r.client_name,
        reviewerType: 'Client',
        revieweeName: r.labour_contractors?.company_name || r.labour_contractors?.name || '',
        revieweeType: 'Labour Contractor',
      })),
    ];

    reviews.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return reviews;
  }

  async delete(sourceTable: string, id: string) {
    const tableMap: Record<string, string> = {
      manufacturer_coal_ratings: 'manufacturer_coal_ratings',
      manufacturer_transport_ratings: 'manufacturer_transport_ratings',
      coal_provider_manufacturer_ratings: 'coal_provider_manufacturer_ratings',
      transport_provider_manufacturer_ratings:
        'transport_provider_manufacturer_ratings',
      labour_contractor_ratings: 'labour_contractor_ratings',
    };

    const table = tableMap[sourceTable];
    if (!table) throw new NotFoundException('Unknown rating table');

    try {
      await (this.prisma[table] as any).delete({ where: { id } });
    } catch {
      throw new NotFoundException('Review not found');
    }

    return { success: true };
  }
}
