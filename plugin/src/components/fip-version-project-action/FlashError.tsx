export function FlashError({ message }: { message: string }) {
    return (
        <div className="alert alert-danger d-flex align-items-baseline">
            <i className="fas fa-exclamation-circle"></i>
            <div className="ms-2">{message}</div>
        </div>
    )
}
