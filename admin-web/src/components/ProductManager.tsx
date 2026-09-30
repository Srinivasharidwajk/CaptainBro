import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Tag,
  Scissors,
  AlertCircle,
  PackageCheck,
  Minus,
  Upload,
  Video,
  Film,
  ShoppingBag,
  Link,
  Image as ImageIcon,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { doc, updateDoc, addDoc, deleteDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export interface RecipeVideoItem {
  id?: string;
  name: string;
  image?: string;
  videoUrl: string;
  time?: string;
  difficulty?: string;
  description?: string;
}

export interface FrequentItem {
  id?: string;
  name: string;
  price: number;
  weight?: string;
  image?: string;
  category?: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  weight?: string;
  category?: string;
  image?: string;
  additionalImages?: string[];
  videoUrl?: string;
  recipeVideos?: RecipeVideoItem[];
  frequentlyBought?: FrequentItem[];
  inStock?: boolean;
  stockQuantity?: number;
  description?: string;
  cuttingStyles?: string[];
}

const AVAILABLE_CUTS = [
  'Curry Cut',
  'Biryani Cut',
  'Boneless Cubes',
  'Keema / Mince',
  'Whole Bird Cleaned',
  'Soup Bones',
  'Fillet / Steaks',
  'Skinless Cut',
];

const DEFAULT_RECIPES: RecipeVideoItem[] = [
  {
    name: 'Special Chicken / Meat Curry',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://ik.imagekit.io/CaptainBro/tr:orig-true/CaptionBro%20Product%20recipes%20Videos/Chicken%20Curry.mp4',
    time: '45 Mins',
  },
  {
    name: 'Special Biryani Dum',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://ik.imagekit.io/CaptainBro/tr:orig-true/CaptionBro%20Product%20recipes%20Videos/Chicken%20biryani.mp4',
    time: '15 Mins Video',
  },
];

const DEFAULT_FREQUENT_ITEMS: FrequentItem[] = [
  {
    name: 'Refined Sunflower Cooking Oil',
    price: 140,
    weight: '1L',
    image: 'cooking-oil.png',
  },
  {
    name: 'Fresh Ginger Garlic Paste',
    price: 35,
    weight: '100g',
    image: 'fooditems.png',
  },
  {
    name: 'Organic Farm Onions',
    price: 35,
    weight: '1kg',
    image: 'onions.png',
  },
  {
    name: 'Fresh Green Chillies',
    price: 15,
    weight: '250g',
    image: 'fooditems.png',
  },
];

interface ProductManagerProps {
  products: Product[];
}

export default function ProductManager({ products }: ProductManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formOrigPrice, setFormOrigPrice] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formStockQuantity, setFormStockQuantity] = useState('50');
  const [formCategory, setFormCategory] = useState('meat');
  const [formImage, setFormImage] = useState('');
  const [formAdditionalImages, setFormAdditionalImages] = useState<string[]>([]);
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formRecipeVideos, setFormRecipeVideos] = useState<RecipeVideoItem[]>([]);
  const [formFrequentlyBought, setFormFrequentlyBought] = useState<FrequentItem[]>([]);
  const [formDesc, setFormDesc] = useState('');
  const [formCuttingStyles, setFormCuttingStyles] = useState<string[]>(['Curry Cut', 'Biryani Cut']);

  // File input refs for quick upload triggers
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter((p) => {
    const matchesCat = categoryFilter === 'all' || (p.category || '').toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isExplicitlyOutOfStock = p.inStock === false || p.stockQuantity === 0;
    const isLowStock = !isExplicitlyOutOfStock && typeof p.stockQuantity === 'number' && p.stockQuantity > 0 && p.stockQuantity <= 5;

    let matchesStock = true;
    if (stockFilter === 'in_stock') matchesStock = !isExplicitlyOutOfStock;
    if (stockFilter === 'low_stock') matchesStock = isLowStock;
    if (stockFilter === 'out_of_stock') matchesStock = isExplicitlyOutOfStock;

    return matchesCat && matchesSearch && matchesStock;
  });

  const handleUploadFile = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
      const filename = `products/${Date.now()}_${cleanName}.${ext}`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err: any) {
      console.warn('Storage upload error, falling back to local filename:', err);
      // Fallback: return file name or data URI
      return file.name;
    } finally {
      setIsUploading(false);
    }
  };

  const handlePrimaryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleUploadFile(file);
    setFormImage(url);
  };

  const handleAdditionalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleUploadFile(file);
    setFormAdditionalImages((prev) => [...prev, url]);
  };

  const handleToggleStock = async (product: Product) => {
    try {
      const isCurrentlyInStock = product.inStock !== false && (product.stockQuantity === undefined || product.stockQuantity > 0);
      const refDoc = doc(db, 'products', product.id);

      if (isCurrentlyInStock) {
        await updateDoc(refDoc, {
          inStock: false,
          stockQuantity: 0,
          updatedAt: new Date(),
        });
      } else {
        const restoredQty = product.stockQuantity && product.stockQuantity > 0 ? product.stockQuantity : 25;
        await updateDoc(refDoc, {
          inStock: true,
          stockQuantity: restoredQty,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      alert('Failed to update stock: ' + (err as any).message);
    }
  };

  const handleAdjustQuantity = async (product: Product, delta: number) => {
    try {
      const currentQty = typeof product.stockQuantity === 'number' ? product.stockQuantity : (product.inStock !== false ? 25 : 0);
      const newQty = Math.max(0, currentQty + delta);
      const refDoc = doc(db, 'products', product.id);
      await updateDoc(refDoc, {
        stockQuantity: newQty,
        inStock: newQty > 0,
        updatedAt: new Date(),
      });
    } catch (err) {
      alert('Failed to update quantity: ' + (err as any).message);
    }
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPrice(String(p.price));
    setFormOrigPrice(String(p.originalPrice || ''));
    setFormWeight(p.weight || '');
    setFormStockQuantity(p.stockQuantity !== undefined ? String(p.stockQuantity) : (p.inStock !== false ? '25' : '0'));
    setFormCategory(p.category || 'meat');
    setFormImage(p.image || '');
    setFormAdditionalImages(Array.isArray(p.additionalImages) ? p.additionalImages : []);
    setFormVideoUrl(p.videoUrl || '');
    setFormRecipeVideos(Array.isArray(p.recipeVideos) ? p.recipeVideos : []);
    setFormFrequentlyBought(Array.isArray(p.frequentlyBought) ? p.frequentlyBought : []);
    setFormDesc(p.description || '');
    setFormCuttingStyles(p.cuttingStyles && p.cuttingStyles.length > 0 ? p.cuttingStyles : ['Curry Cut', 'Biryani Cut']);
  };

  const handleOpenAdd = () => {
    setIsAddingNew(true);
    setEditingProduct(null);
    setFormName('');
    setFormPrice('');
    setFormOrigPrice('');
    setFormWeight('500g');
    setFormStockQuantity('50');
    setFormCategory('meat');
    setFormImage('');
    setFormAdditionalImages([]);
    setFormVideoUrl('');
    setFormRecipeVideos(DEFAULT_RECIPES);
    setFormFrequentlyBought(DEFAULT_FREQUENT_ITEMS);
    setFormDesc('');
    setFormCuttingStyles(['Curry Cut', 'Biryani Cut']);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) {
      alert('Product name and price are required!');
      return;
    }

    const parsedStock = formStockQuantity.trim() !== '' ? Math.max(0, parseInt(formStockQuantity, 10)) : 0;
    const isItemInStock = parsedStock > 0;

    try {
      const payload: any = {
        name: formName.trim(),
        price: parseFloat(formPrice),
        originalPrice: formOrigPrice ? parseFloat(formOrigPrice) : parseFloat(formPrice) * 1.15,
        weight: formWeight.trim() || '500g',
        stockQuantity: parsedStock,
        inStock: isItemInStock,
        category: formCategory,
        image: formImage.trim() || 'fooditems.png',
        additionalImages: formAdditionalImages.filter((img) => img.trim() !== ''),
        videoUrl: formVideoUrl.trim() || '',
        recipeVideos: formRecipeVideos
          .filter((r) => r.name.trim() !== '')
          .map((r, idx) => ({
            ...r,
            id: r.id || `rv_${Date.now()}_${idx}`,
          })),
        frequentlyBought: formFrequentlyBought
          .filter((f) => f.name.trim() !== '')
          .map((f, idx) => ({
            ...f,
            id: f.id || `comp_${Date.now()}_${idx}_${f.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            price: typeof f.price === 'number' ? f.price : parseFloat(String(f.price)) || 25,
            weight: f.weight || '50g',
            image: f.image || 'fooditems.png',
          })),
        description: formDesc.trim(),
        updatedAt: new Date(),
      };

      if (formCategory === 'meat') {
        payload.cuttingStyles = formCuttingStyles;
      }

      if (editingProduct) {
        const refDoc = doc(db, 'products', editingProduct.id);
        await updateDoc(refDoc, payload);
        setEditingProduct(null);
      } else {
        payload.createdAt = new Date();
        await addDoc(collection(db, 'products'), payload);
        setIsAddingNew(false);
      }
    } catch (err) {
      alert('Save error: ' + (err as any).message);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      alert('Delete error: ' + (err as any).message);
    }
  };

  // Recipe Videos Helpers
  const handleAddRecipeVideo = () => {
    setFormRecipeVideos([
      ...formRecipeVideos,
      {
        name: '',
        image: '',
        videoUrl: '',
        time: '5 Mins',
      },
    ]);
  };

  const handleUpdateRecipeVideo = (index: number, field: keyof RecipeVideoItem, val: string) => {
    const updated = [...formRecipeVideos];
    updated[index] = { ...updated[index], [field]: val };
    setFormRecipeVideos(updated);
  };

  const handleRemoveRecipeVideo = (index: number) => {
    setFormRecipeVideos(formRecipeVideos.filter((_, i) => i !== index));
  };

  // Frequently Bought Helpers
  const handleAddFrequentItem = () => {
    setFormFrequentlyBought([
      ...formFrequentlyBought,
      {
        name: '',
        price: 25,
        weight: '50g',
        image: '',
      },
    ]);
  };

  const handleUpdateFrequentItem = (index: number, field: keyof FrequentItem, val: any) => {
    const updated = [...formFrequentlyBought];
    updated[index] = { ...updated[index], [field]: val };
    setFormFrequentlyBought(updated);
  };

  const handleRemoveFrequentItem = (index: number) => {
    setFormFrequentlyBought(formFrequentlyBought.filter((_, i) => i !== index));
  };

  // Stock counts summary
  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => p.inStock === false || p.stockQuantity === 0).length;
  const lowStockCount = products.filter(
    (p) => p.inStock !== false && p.stockQuantity !== 0 && typeof p.stockQuantity === 'number' && p.stockQuantity > 0 && p.stockQuantity <= 5
  ).length;
  const inStockCount = totalProducts - outOfStockCount;

  return (
    <div>
      <div className="section-header-bar">
        <div className="section-title">
          <h2>Product & Inventory Catalog</h2>
          <p>Manage products, media gallery, recipe videos, complementary items, and live stock</p>
        </div>

        {/* Quick Inventory Metric Pills */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div
            onClick={() => setStockFilter('all')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: stockFilter === 'all' ? '#1E293B' : '#0F172A',
              border: stockFilter === 'all' ? '1px solid #64748B' : '1px solid var(--border)',
              color: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            All: <span style={{ color: '#38BDF8' }}>{totalProducts}</span>
          </div>

          <div
            onClick={() => setStockFilter('in_stock')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: stockFilter === 'in_stock' ? 'rgba(16, 185, 129, 0.2)' : '#0F172A',
              border: stockFilter === 'in_stock' ? '1px solid #10B981' : '1px solid var(--border)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <PackageCheck size={14} /> In Stock: <span>{inStockCount}</span>
          </div>

          <div
            onClick={() => setStockFilter('low_stock')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: stockFilter === 'low_stock' ? 'rgba(245, 158, 11, 0.2)' : '#0F172A',
              border: stockFilter === 'low_stock' ? '1px solid #F59E0B' : '1px solid var(--border)',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} /> Low Stock (≤5): <span>{lowStockCount}</span>
          </div>

          <div
            onClick={() => setStockFilter('out_of_stock')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: stockFilter === 'out_of_stock' ? 'rgba(239, 68, 68, 0.2)' : '#0F172A',
              border: stockFilter === 'out_of_stock' ? '1px solid #EF4444' : '1px solid var(--border)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Out of Stock: <span>{outOfStockCount}</span>
          </div>
        </div>

        <div className="search-filter-row" style={{ marginTop: '0.5rem' }}>
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="meat">Fresh Meat & Seafood</option>
            <option value="pickles">Homemade Pickles</option>
            <option value="home-foods">Home Foods & Telangana Sweets</option>
            <option value="our-products">Our Brand Specials</option>
            <option value="vegetables">Farm Vegetables</option>
            <option value="fruits">Fresh Fruits</option>
            <option value="grocery">Daily Groceries</option>
          </select>

          <button className="action-btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Weight</th>
              <th>Price</th>
              <th>Media & Extras</th>
              <th>Quantity in Stock</th>
              <th>Stock Status</th>
              <th>Quick Actions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const qty = typeof p.stockQuantity === 'number' ? p.stockQuantity : p.inStock !== false ? 25 : 0;
              const isOutOfStock = p.inStock === false || qty === 0;
              const isLowStock = !isOutOfStock && qty <= 5;
              const hasRecipes = Array.isArray(p.recipeVideos) && p.recipeVideos.length > 0;
              const hasComplements = Array.isArray(p.frequentlyBought) && p.frequentlyBought.length > 0;
              const hasVideo = !!p.videoUrl;

              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: '#1F2937',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.08)',
                          flexShrink: 0,
                        }}
                      >
                        {p.image?.startsWith('http') ? (
                          <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Tag size={18} color="#9CA3AF" />
                        )}
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, display: 'block', color: '#F9FAFB' }}>{p.name}</span>
                        {p.cuttingStyles && p.cuttingStyles.length > 0 && (
                          <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                            {p.cuttingStyles.length} butchery cut options
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                      {p.category || 'General'}
                    </span>
                  </td>
                  <td>{p.weight || '500g'}</td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#F9FAFB' }}>₹{p.price}</span>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', textDecoration: 'line-through', marginLeft: '6px' }}>
                        ₹{p.originalPrice}
                      </span>
                    )}
                  </td>

                  {/* Media & Extras Badges */}
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {hasVideo && (
                        <span
                          title="Product Video Attached"
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#F87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Film size={10} /> Video
                        </span>
                      )}
                      {hasRecipes && (
                        <span
                          title={`${p.recipeVideos?.length} Recipe Videos Attached`}
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38BDF8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Video size={10} /> {p.recipeVideos?.length} Recipes
                        </span>
                      )}
                      {hasComplements && (
                        <span
                          title={`${p.frequentlyBought?.length} Frequently Bought Together items`}
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#C084FC',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <ShoppingBag size={10} /> {p.frequentlyBought?.length} Complements
                        </span>
                      )}
                      {!hasVideo && !hasRecipes && !hasComplements && (
                        <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>Standard</span>
                      )}
                    </div>
                  </td>

                  {/* Quantity In Stock Stepper Column */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        title="Decrease Stock (-1)"
                        className="btn-secondary"
                        style={{
                          width: '28px',
                          height: '28px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          color: '#EF4444',
                          borderColor: 'var(--border-light)',
                        }}
                        onClick={() => handleAdjustQuantity(p, -1)}
                        disabled={qty <= 0}
                      >
                        <Minus size={13} />
                      </button>

                      <div
                        style={{
                          minWidth: '46px',
                          textAlign: 'center',
                          padding: '0.2rem 0.5rem',
                          background: isOutOfStock
                            ? 'rgba(239, 68, 68, 0.1)'
                            : isLowStock
                            ? 'rgba(245, 158, 11, 0.1)'
                            : '#1E293B',
                          borderRadius: '6px',
                          border: isOutOfStock
                            ? '1px solid rgba(239, 68, 68, 0.3)'
                            : isLowStock
                            ? '1px solid rgba(245, 158, 11, 0.3)'
                            : '1px solid var(--border)',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#F9FAFB',
                        }}
                      >
                        {qty}
                      </div>

                      <button
                        title="Increase Stock (+1)"
                        className="btn-secondary"
                        style={{
                          width: '28px',
                          height: '28px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          color: '#10B981',
                          borderColor: 'var(--border-light)',
                        }}
                        onClick={() => handleAdjustQuantity(p, 1)}
                      >
                        <Plus size={13} />
                      </button>

                      <button
                        title="Quick Restock (+10)"
                        className="btn-secondary"
                        style={{
                          padding: '0.2rem 0.45rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          color: '#38BDF8',
                          borderColor: 'var(--border-light)',
                        }}
                        onClick={() => handleAdjustQuantity(p, 10)}
                      >
                        +10
                      </button>
                    </div>
                  </td>

                  {/* Stock Status Badge */}
                  <td>
                    {isOutOfStock ? (
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#EF4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <X size={12} /> OUT OF STOCK
                      </span>
                    ) : isLowStock ? (
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#F59E0B',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <AlertCircle size={12} /> LOW STOCK ({qty} left)
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: '#10B981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Check size={12} /> IN STOCK ({qty})
                      </span>
                    )}
                  </td>

                  {/* Toggle Stock Button */}
                  <td>
                    <button
                      className="btn-secondary"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: !isOutOfStock ? '#EF4444' : '#10B981',
                        borderColor: !isOutOfStock ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                      }}
                      onClick={() => handleToggleStock(p)}
                    >
                      {!isOutOfStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                    </button>
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-secondary" title="Edit Product" style={{ padding: '0.4rem' }} onClick={() => handleOpenEdit(p)}>
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="btn-secondary"
                        title="Delete Product"
                        style={{ padding: '0.4rem', color: '#EF4444' }}
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hidden File Inputs for Direct Local File Upload */}
      <input
        type="file"
        ref={primaryFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handlePrimaryFileSelect}
      />
      <input
        type="file"
        ref={additionalFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleAdditionalFileSelect}
      />

      {/* Add / Edit Product Modal - Rich Configuration with Media & Recipe Options */}
      {(editingProduct || isAddingNew) && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '720px', width: '100%', padding: '1.75rem' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F9FAFB' }}>
                  {editingProduct ? 'Edit Item' : 'Add New Product'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Configure product details, gallery, recipe videos, and complementary items
                </p>
              </div>
              <button
                className="close-btn"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingNew(false);
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              {/* Product Name */}
              <div className="form-group">
                <label style={{ fontWeight: 700, color: '#F3F4F6' }}>Product Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Fresh Malai Paneer / Tender Chicken Curry Cut"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label style={{ fontWeight: 700, color: '#F3F4F6' }}>Category</label>
                <select
                  className="form-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="meat">Fresh Meat & Seafood</option>
                  <option value="pickles">Homemade Pickles</option>
                  <option value="home-foods">Home Foods & Telangana Sweets</option>
                  <option value="our-products">Our Brand Specials</option>
                  <option value="vegetables">Farm Fresh Vegetables</option>
                  <option value="fruits">Fresh Fruits</option>
                  <option value="grocery">Daily Groceries</option>
                </select>
              </div>

              {/* Price, Original Price, Weight, Stock Quantity 2x2 Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, color: '#F3F4F6' }}>Price (INR) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: '36px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}
                      onClick={() => setFormPrice((prev) => String(Math.max(0, (parseFloat(prev) || 0) - 10)))}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      className="form-input"
                      style={{ textAlign: 'center', fontWeight: 800 }}
                      placeholder="150"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: '36px', height: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}
                      onClick={() => setFormPrice((prev) => String((parseFloat(prev) || 0) + 10))}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, color: '#F3F4F6' }}>Weight / Size *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="500g / 1kg / 250ml"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ color: 'var(--text-muted)' }}>Original / MRP (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="300"
                    value={formOrigPrice}
                    onChange={(e) => setFormOrigPrice(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#F3F4F6', fontWeight: 700 }}>
                    <span>Quantity in Stock *</span>
                    {parseInt(formStockQuantity || '0', 10) <= 0 ? (
                      <span style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 700 }}>Out of Stock</span>
                    ) : parseInt(formStockQuantity || '0', 10) <= 5 ? (
                      <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700 }}>Low Stock</span>
                    ) : (
                      <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: 700 }}>In Stock</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 50"
                    value={formStockQuantity}
                    onChange={(e) => setFormStockQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label style={{ fontWeight: 700, color: '#F3F4F6' }}>Description</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Freshly sourced, hygienic cut..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              {/* Product Image (Primary) */}
              <div className="form-group" style={{ background: '#0F172A', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <label style={{ fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Product Image (Primary) *</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upload File or Paste URL</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Thumbnail Box */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: '#1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)',
                      flexShrink: 0,
                    }}
                  >
                    {formImage ? (
                      formImage.startsWith('http') ? (
                        <img src={formImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: '#9CA3AF', textAlign: 'center', padding: '2px' }}>
                          {formImage.slice(0, 12)}
                        </span>
                      )
                    ) : (
                      <ImageIcon size={20} color="#6B7280" />
                    )}
                  </div>

                  {/* Choose File Button */}
                  <button
                    type="button"
                    onClick={() => primaryFileInputRef.current?.click()}
                    style={{
                      padding: '0.5rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #EA580C',
                      background: 'rgba(234, 88, 12, 0.1)',
                      color: '#FB923C',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                    }}
                  >
                    <FolderOpen size={15} /> Choose File
                  </button>

                  {/* URL Input */}
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2rem', paddingRight: '2rem', fontSize: '0.82rem' }}
                      placeholder="https://ik.imagekit.io/... or chicken-category.png"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                    />
                    <Link size={14} color="#9CA3AF" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                    {formImage && (
                      <button
                        type="button"
                        onClick={() => setFormImage('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#9CA3AF',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Product Images */}
              <div className="form-group" style={{ background: '#0F172A', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <label style={{ fontWeight: 700, color: '#F9FAFB', margin: 0 }}>Additional Product Images</label>
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Enter Additional Image URL:');
                      if (url && url.trim()) {
                        setFormAdditionalImages([...formAdditionalImages, url.trim()]);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#F87171',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    + Add Image URL
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
                  {formAdditionalImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '52px',
                        height: '52px',
                        borderRadius: '8px',
                        background: '#1E293B',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {imgUrl.startsWith('http') ? (
                        <img src={imgUrl} alt={`Additional ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: '0.65rem', padding: '2px', textAlign: 'center' }}>
                          {imgUrl.slice(0, 10)}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setFormAdditionalImages(formAdditionalImages.filter((_, i) => i !== idx))}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#EF4444',
                          color: '#FFFFFF',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* + Upload Dashed Button */}
                  <button
                    type="button"
                    onClick={() => additionalFileInputRef.current?.click()}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      border: '1.5px dashed #475569',
                      background: 'rgba(30, 41, 59, 0.5)',
                      color: '#94A3B8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      gap: '2px',
                    }}
                  >
                    <Plus size={16} />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {/* Video Link (Optional) */}
              <div className="form-group">
                <label style={{ fontWeight: 700, color: '#F3F4F6' }}>Video Link (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2rem' }}
                    placeholder="e.g. https://ik.imagekit.io/.../recipe-video.mp4"
                    value={formVideoUrl}
                    onChange={(e) => setFormVideoUrl(e.target.value)}
                  />
                  <Film size={15} color="#9CA3AF" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Butchery Cutting Styles for Meat Category */}
              {formCategory === 'meat' && (
                <div className="form-group" style={{ background: '#0F172A', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem', fontWeight: 700, color: '#F87171' }}>
                    <Scissors size={15} /> Available Butchery Cutting Styles
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Select which customized cuts customers can choose when adding this meat to cart:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {AVAILABLE_CUTS.map((cut) => {
                      const isSelected = formCuttingStyles.includes(cut);
                      return (
                        <button
                          key={cut}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormCuttingStyles(formCuttingStyles.filter((c) => c !== cut));
                            } else {
                              setFormCuttingStyles([...formCuttingStyles, cut]);
                            }
                          }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: isSelected ? '1px solid #8B0000' : '1px solid var(--border)',
                            background: isSelected ? '#8B0000' : '#1E293B',
                            color: '#FFFFFF',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{cut}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fresh Meat & Seafood / Paneer Options Card (Matching Screenshot) */}
              <div
                style={{
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  backgroundColor: 'rgba(239, 68, 68, 0.03)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                {/* Header with Active badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(239, 68, 68, 0.15)', paddingBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🥩</span>
                    <strong style={{ fontSize: '1rem', color: '#F87171' }}>Fresh Meat & Paneer Options</strong>
                  </div>
                  <span
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      backgroundColor: '#8B0000',
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                    }}
                  >
                    Active
                  </span>
                </div>

                {/* 1. Recommended Recipe Videos Section */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Video size={16} color="#F87171" />
                      <strong style={{ fontSize: '0.92rem', color: '#F3F4F6' }}>Recommended Recipe Videos</strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRecipeVideo}
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#F87171',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={13} /> Add Video
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Image thumbnail link + video link displayed in product detail recipe section.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {formRecipeVideos.map((rec, index) => (
                      <div
                        key={index}
                        style={{
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '10px',
                          padding: '1rem',
                          backgroundColor: '#0F172A',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#F87171' }}>Recipe #{index + 1}</strong>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeVideo(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Recipe Title */}
                        <div style={{ marginBottom: '0.65rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Special Paneer Curry / Special Chicken Curry"
                            value={rec.name}
                            onChange={(e) => handleUpdateRecipeVideo(index, 'name', e.target.value)}
                          />
                        </div>

                        {/* Thumbnail Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              background: '#1E293B',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {rec.image?.startsWith('http') ? (
                              <img src={rec.image} alt="Recipe Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <ImageIcon size={16} color="#6B7280" />
                            )}
                          </div>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
                              placeholder="Thumbnail Image URL (https://...)"
                              value={rec.image || ''}
                              onChange={(e) => handleUpdateRecipeVideo(index, 'image', e.target.value)}
                            />
                            <Link size={13} color="#9CA3AF" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                          </div>
                        </div>

                        {/* Video URL & Time */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
                              placeholder="Video Link (MP4 / WebM / ImageKit)"
                              value={rec.videoUrl}
                              onChange={(e) => handleUpdateRecipeVideo(index, 'videoUrl', e.target.value)}
                            />
                            <Film size={13} color="#9CA3AF" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                          </div>
                          <div>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: '0.8rem' }}
                              placeholder="e.g. 5 Mins"
                              value={rec.time || '5 Mins'}
                              onChange={(e) => handleUpdateRecipeVideo(index, 'time', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Frequently Bought Together Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShoppingBag size={16} color="#F87171" />
                      <strong style={{ fontSize: '0.92rem', color: '#F3F4F6' }}>
                        Frequently Bought Together ({formFrequentlyBought.length})
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFrequentItem}
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#F87171',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={13} /> Add Item
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Add complementary items (Cooking Oil, Ginger Garlic Paste, Onions, Chillies, Spices, Masala, Rice).
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {formFrequentlyBought.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '10px',
                          padding: '1rem',
                          backgroundColor: '#0F172A',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#F87171' }}>Complement Item #{index + 1}</strong>
                          <button
                            type="button"
                            onClick={() => handleRemoveFrequentItem(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Image Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              background: '#1E293B',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {item.image?.startsWith('http') ? (
                              <img src={item.image} alt="Complement" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <ImageIcon size={16} color="#6B7280" />
                            )}
                          </div>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ paddingLeft: '2rem', fontSize: '0.8rem' }}
                              placeholder="Complement Item Image URL or Asset (e.g. onions.png)"
                              value={item.image || ''}
                              onChange={(e) => handleUpdateFrequentItem(index, 'image', e.target.value)}
                            />
                            <Link size={13} color="#9CA3AF" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                          </div>
                        </div>

                        {/* Item Name */}
                        <div style={{ marginBottom: '0.65rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Paneer Kebab Premix / Organic Farm Onions"
                            value={item.name}
                            onChange={(e) => handleUpdateFrequentItem(index, 'name', e.target.value)}
                          />
                        </div>

                        {/* Price & Weight */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <input
                              type="number"
                              className="form-input"
                              style={{ fontSize: '0.8rem' }}
                              placeholder="Price (₹), e.g. 25"
                              value={item.price || ''}
                              onChange={(e) => handleUpdateFrequentItem(index, 'price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: '0.8rem' }}
                              placeholder="Weight / Pack, e.g. 50g / 1kg"
                              value={item.weight || '50g'}
                              onChange={(e) => handleUpdateFrequentItem(index, 'weight', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsAddingNew(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn-primary"
                  style={{
                    backgroundColor: '#8B0000',
                    borderColor: '#8B0000',
                    padding: '0.75rem 2rem',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                  }}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : editingProduct ? 'Save Changes' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
