import * as WebBrowser from 'expo-web-browser';

const IMAGEKIT_BASE = "https://ik.imagekit.io/CaptainBro/tr:orig-true/CaptionBro%20Product%20recipes%20Videos";

export interface RecipeVideo {
  id: string;
  name: string;
  category: 'chicken' | 'mutton' | 'fish' | 'prawns';
  time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  image: any;
  videoUrl: string;
  description: string;
}

export const RECIPE_VIDEOS: Record<string, RecipeVideo[]> = {
  chicken: [
    {
      id: 'rc_chk_1',
      name: 'Special Chicken Curry',
      category: 'chicken',
      time: '45 Mins',
      difficulty: 'Medium',
      image: { uri: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Chicken%20Curry.mp4`,
      description: 'Traditional Warangal style rich chicken gravy curry with fresh spices.'
    },
    {
      id: 'rc_chk_2',
      name: 'Special Chicken Biryani',
      category: 'chicken',
      time: '15 Mins Video',
      difficulty: 'Easy',
      image: { uri: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Chicken%20biryani.mp4`,
      description: 'Authentic Hyderabadi dum biryani recipe with tender chicken cuts.'
    },
    {
      id: 'rc_chk_3',
      name: 'Special Chicken Pakora',
      category: 'chicken',
      time: '40 Mins',
      difficulty: 'Medium',
      image: { uri: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Chicken%20pakoda%20main.mp4`,
      description: 'Crispy, spicy fried chicken pakora snack.'
    },
    {
      id: 'rc_chk_4',
      name: 'Special Chicken Fry',
      category: 'chicken',
      time: '30 Mins',
      difficulty: 'Easy',
      image: { uri: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Chicken%20fry.mp4`,
      description: 'Quick spicy chicken roast fry recipe.'
    }
  ],
  mutton: [
    {
      id: 'rc_mut_1',
      name: 'Special Mutton Curry',
      category: 'mutton',
      time: '60 Mins',
      difficulty: 'Medium',
      image: { uri: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Mutton%20curry.mp4`,
      description: 'Rich, slow-cooked tender goat mutton gravy.'
    },
    {
      id: 'rc_mut_2',
      name: 'Special Mutton Biryani',
      category: 'mutton',
      time: '12 Mins Video',
      difficulty: 'Easy',
      image: { uri: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Mutton%20biryani.mp4`,
      description: 'Flavorful mutton biryani recipe cooked to perfection.'
    },
    {
      id: 'rc_mut_3',
      name: 'Special Mutton Fry',
      category: 'mutton',
      time: '50 Mins',
      difficulty: 'Medium',
      image: { uri: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Mutton%20Fryone.mp4`,
      description: 'Spicy dry mutton pepper fry recipe.'
    },
    {
      id: 'rc_mut_4',
      name: 'Special Mutton Pakora',
      category: 'mutton',
      time: '70 Mins',
      difficulty: 'Hard',
      image: { uri: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Mutton%20pakoda.mp4`,
      description: 'Crispy deep-fried tender mutton bites.'
    }
  ],
  fish: [
    {
      id: 'rc_fsh_1',
      name: 'Telangana Fish Pulusu',
      category: 'fish',
      time: '35 Mins',
      difficulty: 'Medium',
      image: { uri: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Fish%20pulusu%20main.mp4`,
      description: 'Traditional tamarind sour fish pulusu with Koramanu fish.'
    },
    {
      id: 'rc_fsh_2',
      name: 'Special Fish Fry',
      category: 'fish',
      time: '25 Mins',
      difficulty: 'Easy',
      image: { uri: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Fish%20fry.mov`,
      description: 'Golden crispy tawa fish fry recipe.'
    }
  ],
  prawns: [
    {
      id: 'rc_prw_1',
      name: 'Special Prawns Curry',
      category: 'prawns',
      time: '25 Mins',
      difficulty: 'Easy',
      image: { uri: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Prawns%20curry.mp4`,
      description: 'Juicy prawns gravy curry recipe.'
    },
    {
      id: 'rc_prw_2',
      name: 'Special Prawns Fry',
      category: 'prawns',
      time: '30 Mins',
      difficulty: 'Easy',
      image: { uri: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Prawns%20fry.mp4`,
      description: 'Crispy garlic prawns masala fry.'
    }
  ],
  paneer: [
    {
      id: 'rc_pan_1',
      name: 'Paneer Curry — Easy 15-Min...',
      category: 'chicken' as any,
      time: '30 Mins',
      difficulty: 'Easy',
      image: { uri: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Chicken%20Curry.mp4`,
      description: 'Delicious step-by-step recipe tutorial video.'
    },
    {
      id: 'rc_pan_2',
      name: 'Paneer Biryani — Easy & Deli...',
      category: 'chicken' as any,
      time: '30 Mins',
      difficulty: 'Easy',
      image: { uri: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80' },
      videoUrl: `${IMAGEKIT_BASE}/Chicken%20biryani.mp4`,
      description: 'Delicious step-by-step recipe tutorial video.'
    }
  ]
};

export const playRecipeVideo = async (videoUrl: string) => {
  try {
    await WebBrowser.openBrowserAsync(videoUrl);
  } catch (err) {
    console.warn('Failed to open video browser:', err);
  }
};
