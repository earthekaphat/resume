function ProductCard() {

    const product = {
        imageSrc: "images/iphone.jpg",
        title: "iPhone 17 Pro",
        specification: ["A18 Pro chip blaaaaaa", "312gfsgfsgfsg", "510000000000sdasd"],
        price: 999
    }

    function getProductTitle(product: { imageSrc?: string; title: any; specification?: string[]; price?: number; }) {
        return product.title
    }
    return (
        <article style={{
            border: "1px solid white",
            borderRadius: "8px",
            padding: "16px",
            textAlign: "center",
        }}>
            <h2>{getProductTitle(product)}</h2>
            <img
                src={product.imageSrc}
                alt="iPhone 17 Pro"
                width="128"
                height="128"
            />
            <p>Specification</p>
            <ul style={{ listStyle: "disc", paddingLeft: 20 }}>
                <li>
                    {product.specification[0]}
                </li>
                <li>
                    {product.specification[1]}
                </li>
                <li>
                    {product.specification[2]}
                </li>
            </ul>
            <button>Buy (From ${product.price})</button>
        </article>
    );
}

export { ProductCard }