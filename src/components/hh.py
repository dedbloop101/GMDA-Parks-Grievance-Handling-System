def solve():
    data = open(0).read().split()
    if not data:
        return
        
    N = int(data[0])
    K = int(data[1])
    A = [int(x) for x in data[2:N+2]]
    
    INF = 10**18
    tree = [-INF] * (2 * N + 5)
    
    def update(p, val):
        p += N + 1
        tree[p] = val
        p //= 2
        while p > 0:
            left = tree[2 * p]
            right = tree[2 * p + 1]
            tree[p] = left if left > right else right
            p //= 2

    def query(l, r):
        res = -INF
        l += N + 1
        r += N + 2
        while l < r:
            if l % 2 == 1:
                if tree[l] > res: res = tree[l]
                l += 1
            if r % 2 == 1:
                r -= 1
                if tree[r] > res: res = tree[r]
            l //= 2
            r //= 2
        return res

    dp = [-INF] * (N + 1)
    dp[0] = 0
    update(0, 0)
    
    b_val = [0] * 17
    b_pos = [-1] * 17

    for i in range(N):
        v = A[i]
        p = i
        
        for b in range(16, -1, -1):
            if (v >> b) & 1:
                if not b_val[b]:
                    b_val[b] = v
                    b_pos[b] = p
                    break
                if p > b_pos[b]:
                    b_val[b], v = v, b_val[b]
                    b_pos[b], p = p, b_pos[b]
                v ^= b_val[b]
        
        active = []
        for b in range(17):
            if b_val[b]:
                # FIX: Notice the double parentheses here to pass it as a single tuple
                active.append((b_pos[b], b_val[b]))
                
        active.sort(reverse=True)
        
        cur_b = [0] * 17
        last_p = i
        
        for k in range(len(active)):
            v = active[k][1]
            for b in range(16, -1, -1):
                if (v >> b) & 1:
                    if not cur_b[b]:
                        cur_b[b] = v
                        break
                    v ^= cur_b[b]
                    
            max_xor = 0
            for b in range(16, -1, -1):
                if (max_xor ^ cur_b[b]) > max_xor:
                    max_xor ^= cur_b[b]
                    
            L = active[k][0]
            R = last_p
            last_p = L - 1
            
            limit = i - K + 1
            if R >= limit:
                R = limit
                
            if L <= R:
                max_dp = query(L, R)
                if max_dp != -INF and max_dp + max_xor > dp[i + 1]:
                    dp[i + 1] = max_dp + max_xor
                    
        if dp[i + 1] != -INF:
            update(i + 1, dp[i + 1])
            
    # Writing output to STDOUT
    print(dp[N])

if __name__ == '__main__':
    solve()