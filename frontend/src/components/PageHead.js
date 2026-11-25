export default function PageHead({ title, desc, children }) {
  return <div className="phead"><div><h1>{title}</h1>{desc && <p>{desc}</p>}</div><div>{children}</div></div>;
}
