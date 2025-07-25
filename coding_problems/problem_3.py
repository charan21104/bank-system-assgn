def find_minimum_loss(prices):
    price_year_pairs = []
    for i, p in enumerate(prices):
        price_year_pairs.append((p, i))

    price_year_pairs.sort()

    min_loss = float('inf')
    found_loss = False

    for i in range(1, len(price_year_pairs)):
        current_price, current_year = price_year_pairs[i]
        prev_price, prev_year = price_year_pairs[i-1]

        if current_year < prev_year:
            found_loss = True
            loss = current_price - prev_price
            if loss < min_loss:
                min_loss = loss
    
    if found_loss:
        return min_loss
    else:
        return None

def main():
    try:
        num_years = int(input())
        prices = list(map(int, input().split()))
        result = find_minimum_loss(prices)
        if result is not None:
            print(result)
    except:
        pass

if __name__ == "__main__":
    main()
