import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export interface TestimonialItem {
  id: string;
  name: string;
  meta: string;
  text: string;
  stars: number;
}

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 't1',
    name: 'Abhishek S. (NIT W)',
    meta: '21 yrs • Student • Kazipet',
    text: '"Hostel food bore kottinappudu directly ordering chicken wings from here! Acha quality and clean packaging, super fast delivery too. చికెన్ చాలా బాగుంది!"',
    stars: 5,
  },
  {
    id: 't2',
    name: 'Sireesha K.',
    meta: '42 yrs • Homemaker • Kazipet',
    text: '"ఉల్లిపాయలు, కొత్తిమీర చాలా తాజాగా ఉన్నాయి! Very fresh organic vegetables. Direct గా ఇంటికే డెలివరీ చేయడం వల్ల మార్కెట్ కి వెళ్లే శ్రమ తగ్గింది. ధన్యవాదాలు!"',
    stars: 5,
  },
  {
    id: 't3',
    name: 'Ramesh Varma',
    meta: '64 yrs • Retired Manager • Hanamkonda',
    text: '"మటన్ కటింగ్ చాలా నీట్ గా చేసారు. Sunday morning meat shop దగ్గర line లో నిలబడే కష్టం తప్పింది. Fresh and tender goat mutton, whole family loved it!"',
    stars: 5,
  },
  {
    id: 't4',
    name: 'Deepika Reddy',
    meta: '28 yrs • Software Engineer (WFH) • Naimnagar',
    text: '"Work from home time lo quick cooking ki groundnut oil and chicken pickle order chesa. Taste exactly intlo chesinatte undi! Super convenient 20 mins delivery."',
    stars: 5,
  },
  {
    id: 't5',
    name: 'Venkat Rao',
    meta: '56 yrs • School Teacher • Hunter Road',
    text: '"మా ఆవిడ Telangana Sakinalu & Sarva Pindi taste చూసి authentic traditional flavor అని మెచ్చుకుంది. Fresh grocery and genuine quality products."',
    stars: 5,
  },
  {
    id: 't6',
    name: 'Harsha Vardhan',
    meta: '24 yrs • UPSC Aspirant • Subedari',
    text: '"Late night study sessions ki snacks and morning breakfast items/fruits order chestuntanu. Fresh bananas, apples with super fast delivery in Warangal!"',
    stars: 5,
  },
  {
    id: 't7',
    name: 'Dr. Ananya P.',
    meta: '34 yrs • Pediatrician • KMC Warangal',
    text: '"As a doctor, hygiene is my top priority. Meat cuts are cleanly packed, odorless and truly fresh. Best daily essentials app for working mothers."',
    stars: 5,
  },
  {
    id: 't8',
    name: 'Narsimha Chary',
    meta: '71 yrs • Senior Citizen • Waddepally',
    text: '"వయస్సు వల్ల మార్కెట్ కి వెళ్లలేకపోతున్నాను. ఫోన్ లో ఆర్డర్ చేయగానే చక్కగా ఇంటి తలుపు దగ్గరికే తెచ్చి ఇచ్చారు. మంచి గౌరవప్రదమైన డెలివరీ సర్వీస్."',
    stars: 5,
  },
  {
    id: 't9',
    name: 'Kavitha & Sravan',
    meta: '31 yrs • Young Parents • Kishanpura',
    text: '"Fresh thick curd, paneer and organic vegetables daily maa pillala diet kosam teesukuntunnam. Pure quality with zero adulteration. Really happy with Captain Bro!"',
    stars: 5,
  },
  {
    id: 't10',
    name: 'Bhanu Prakash',
    meta: '19 yrs • B.Tech Student • KITS Warangal',
    text: '"Friends tho weekend room lo cook cheskovadaniki boneless chicken and masala powder order chesam. Biryani superb vachindi brother! Pocket friendly prices too."',
    stars: 5,
  },
  {
    id: 't11',
    name: 'Lakshmi Prasanna',
    meta: '49 yrs • Boutique Owner • Ramnagar',
    text: '"మామిడికాయ పచ్చడి (Mango Pickle) and Dhanaya powder taste adbhutam! Pure traditional homemade aroma with perfect spice balance."',
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <View style={styles.testimonialsSection}>
      <View style={styles.testimonialHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>Loved by Locals</Text>
          <FontAwesome name="heart" size={16} color="#8B0000" />
        </View>
        <Text style={styles.testimonialSub}>1,200+ verified ratings across Warangal & Telangana</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {TESTIMONIALS.map((item) => (
          <View key={item.id} style={styles.testimonialCard}>
            <Text style={styles.testimonialText}>{item.text}</Text>
            <View style={styles.testimonialFooter}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.reviewerName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.reviewerMeta} numberOfLines={1}>{item.meta}</Text>
              </View>
              <View style={styles.starsRow}>
                {Array.from({ length: item.stars }).map((_, s) => (
                  <FontAwesome key={s} name="star" size={11} color="#F59E0B" />
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  testimonialsSection: {
    marginVertical: 18,
  },
  testimonialHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  testimonialSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  testimonialCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  testimonialText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  testimonialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  reviewerMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
});
