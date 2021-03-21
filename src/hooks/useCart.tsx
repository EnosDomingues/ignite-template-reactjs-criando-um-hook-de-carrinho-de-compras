import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    return JSON.parse(localStorage.getItem('@RocketShoes:cart') || '[]');
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(item => item.id === productId);

      const productInStock  = await api.get<Stock>(`/stock/${productId}`)
        .then(response => response.data);

      if(productInCart && productInStock) {
        if(productInCart.amount >= productInStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
        } else {
          updateProductAmount({productId, amount: productInCart.amount + 1});
        }
      }

      if(!productInCart && productInStock) {
        const newCartProduct: Product = await api.get(`/products/${productId}`)
          .then(response => response.data);

        setCart([...cart, {...newCartProduct, amount: 1}]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...newCartProduct, amount: 1}]));
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(item => item.id === productId);

      if(product) {  
        const productIndex = cart.findIndex(item => productId === item.id);
        
        cart.splice(productIndex,1);
  
        setCart([...cart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
        
      } else {
        throw new Error('Product does not exists');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productInStock = await api.get(`/stock/${productId}`).then<Stock>(response => response.data);

      if(amount < 1) {
        throw new Error();
      }
      
      if(productInStock) {
        if(amount > productInStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');

        } else {
          const updatedCart = cart.map(item => {
            if(item.id === productId) {
                item.amount = amount;
                return item;       
            }
            return item;
          })
          
          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
