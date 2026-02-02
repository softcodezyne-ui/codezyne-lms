'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/hooks/useCart';
import { 
  LuShoppingCart as ShoppingCart, 
  LuX as X,
  LuArrowLeft as ArrowLeft,
  LuArrowRight as ArrowRight,
  LuTicket as Ticket,
  LuCheck as Check
} from 'react-icons/lu';

export default function CartContent() {
  const { cartItems, isLoaded, removeFromCart } = useCart();
  // Coupon system - commented out
  // const [couponCode, setCouponCode] = useState('');
  // const [discount, setDiscount] = useState(0);
  // const [couponApplied, setCouponApplied] = useState(false);
  // const [couponError, setCouponError] = useState('');

  const removeItem = (id: string) => {
    removeFromCart(id);
  };

  // Coupon system functions - commented out
  // const applyCoupon = () => {
  //   if (!couponCode.trim()) {
  //     setCouponError('Please enter a coupon code');
  //     return;
  //   }

  //   // Mock coupon logic - replace with actual API call
  //   const code = couponCode.toLowerCase().trim();
  //   if (code === 'save10') {
  //     setDiscount(10);
  //     setCouponApplied(true);
  //     setCouponError('');
  //   } else if (code === 'save20') {
  //     setDiscount(20);
  //     setCouponApplied(true);
  //     setCouponError('');
  //   } else {
  //     setDiscount(0);
  //     setCouponApplied(false);
  //     setCouponError('Invalid coupon code');
  //   }
  // };

  // const removeCoupon = () => {
  //   setCouponCode('');
  //   setDiscount(0);
  //   setCouponApplied(false);
  //   setCouponError('');
  // };

  // Calculate subtotal based on all items (courses are sold individually, quantity is always 1)
  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  
  // Coupon system calculations - commented out
  // const discountAmount = (subtotal * discount) / 100;
  // const subtotalAfterDiscount = subtotal - discountAmount;
  
  // Calculate tax on subtotal (1% tax)
  const tax = subtotal * 0.01;
  
  // Calculate final total
  const total = subtotal + tax;

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br pb-10 from-purple-50/30 via-white to-pink-50/30">
      {/* Page Title and Breadcrumbs */}
      <div className="relative bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-blue-50/30 py-12 md:py-16 overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDExLjA0Ni04Ljk1NCAyMC0yMCAyMHMtMjAtOC45NTQtMjAtMjAgOC45NTQtMjAgMjAtMjAgMjAgOC45NTQgMjAgMjB6IiBzdHJva2U9IiM3QjJDQkYiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjMiLz48L2c+PC9zdmc+')] bg-repeat"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 text-center">
            Course Cart
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Link href="/" className="hover:text-purple-600 transition-colors">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Course Cart</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some courses to get started!</p>
            <Link href="/all-courses">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                Browse All Courses
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course List Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                  <div className="col-span-2">
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">IMAGE</span>
                  </div>
                  <div className="col-span-5">
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">COURSE NAME</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">PRICE</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">ACTION</span>
                  </div>
                </div>

                {/* Course Items */}
                <div className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <div key={item._id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-6 hover:bg-gray-50/50 transition-colors">
                      {/* Image */}
                      <div className="col-span-1 md:col-span-2">
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                          {item.thumbnailUrl ? (
                            <Image
                              src={item.thumbnailUrl}
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                              <ShoppingCart className="w-8 h-8 text-purple-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Course Name */}
                      <div className="col-span-1 md:col-span-5">
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{item.title}</h3>
                        {item.lectures && (
                          <p className="text-sm text-gray-500">Lectures: {item.lectures}</p>
                        )}
                        {item.instructor && (
                          <p className="text-sm text-gray-500">Instructor: {item.instructor.name}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="col-span-1 md:col-span-2 flex items-center justify-center md:justify-start">
                        <span className="text-lg font-semibold text-gray-900">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1 md:col-span-3 flex items-center justify-end">
                        <button
                          onClick={() => removeItem(item._id)}
                          className="w-10 h-10 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove from cart"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add More Course */}
                <div className="p-6 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-blue-50/30 border-t border-gray-200">
                  <Link href="/all-courses" className="block">
                    <Button
                      variant="outline"
                      className="w-full border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition-all duration-200"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Browse All Courses
                    </Button>
                  </Link>
                </div>

                {/* Coupon system - commented out */}
                {/* <div className="p-6 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-blue-50/30 border-t border-gray-200">
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-purple-600" />
                        Have a coupon code?
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Ticket className="w-5 h-5" />
                          </div>
                          <Input
                            type="text"
                            placeholder="Enter coupon code (e.g., SAVE10, SAVE20)"
                            value={couponCode}
                            onChange={(e) => {
                              setCouponCode(e.target.value);
                              setCouponError('');
                              setCouponApplied(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                applyCoupon();
                              }
                            }}
                            className={`pl-10 pr-4 h-12 border-2 transition-all duration-200 ${
                              couponApplied
                                ? 'border-green-500 bg-green-50/50 focus:border-green-600 focus:ring-green-500/20'
                                : couponError
                                ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-purple-200 bg-white focus:border-purple-500 focus:ring-purple-500/20'
                            } rounded-lg shadow-sm hover:shadow-md focus:shadow-lg`}
                            disabled={couponApplied}
                          />
                          {couponApplied && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                              <Check className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        {couponApplied ? (
                          <Button
                            onClick={removeCoupon}
                            variant="outline"
                            className="h-12 px-6 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 whitespace-nowrap"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        ) : (
                          <Button
                            onClick={applyCoupon}
                            className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white whitespace-nowrap shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            Apply Coupon
                          </Button>
                        )}
                      </div>
                      {couponError && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <X className="w-4 h-4" />
                          {couponError}
                        </p>
                      )}
                      {couponApplied && discount > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Coupon applied! You saved {discount}% ({discountAmount > 0 ? `$${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8 shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-xl">
                  <CardTitle className="text-xl font-bold">Cart Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between text-gray-700">
                    <span>Sub Total:</span>
                    <span className="font-semibold">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {/* Coupon discount - commented out */}
                  {/* <div className="flex justify-between text-gray-700">
                    <span>Discount:</span>
                    <span className="font-semibold text-green-600">
                      {discount > 0 ? `-$${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                    </span>
                  </div> */}
                  <div className="flex justify-between text-gray-700">
                    <span>Shipping:</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Taxes:</span>
                    <span className="font-semibold">${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <Link href="/payment/checkout" className="block mt-6">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg font-semibold">
                      Checkout Now
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

