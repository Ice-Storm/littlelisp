((lambda (x y)
    (+ x 3 4 (* 10 2) (
        (lambda (d) d)
            (+ 1 1 1 y))))
    (first (
        (if < 3 5 
            rest(1 2 3)))) 
    (first (
        (if > 10 2 
            rest(2 2 2)))))